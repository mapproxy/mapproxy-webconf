import os
import yaml
import gettext
import inspect
import json
from copy import deepcopy
from uuid import uuid4

from xml.etree.ElementTree import ParseError

from mapproxy.client import http
from mapproxy.script.scales import scale_to_res, res_to_scale
from mapproxy.srs import SRS, generate_envelope_points, TransformationError
from mapproxy.grid import tile_grid, GridError

from . import bottle
from . import config
from . import storage
from .bottle import request, response, static_file, template, SimpleTemplate, redirect, abort
from .utils import requires_json
from .capabilities import parse_capabilities_url
from .constants import OGC_DPI, UNIT_FACTOR, M_TO_DEG_FACTOR

configuration = config.ConfigParser.from_file('./config.ini')

app = bottle.Bottle()
bottle.TEMPLATE_PATH = [os.path.join(os.path.dirname(__file__), 'templates')]
SimpleTemplate.defaults["get_url"] = app.get_url
SimpleTemplate.defaults["demo"] = configuration.get_bool('app', 'demo')
SimpleTemplate.defaults["language"] = configuration.get('app', 'language')

try:
    translation = gettext.translation('messages', os.path.join(os.path.dirname(os.path.realpath(__file__)), 'locale'), ['de'])
    translation.install()
    SimpleTemplate.defaults["_"] = translation.gettext

except IOError as e:
    print e

#decorators
def require_project(func):
    def decorator(storage, **kwargs):
        if 'project' in kwargs and storage.exist_project(kwargs['project']):
            if 'storage' in inspect.getargspec(func).args:
                kwargs['storage'] = storage
            return func(**kwargs)
        else:
            abort(404)
    return decorator

## error_pages
def error404(error):
    return template('error', error_code=404, error_message=_('Page not found'))

def error500(error):
    return template('error', error_code=500, error_message=_('Internal server error'))

app.error_handler = {
    404: error404,
    500: error500
}

class RESTBase(object):
    def __init__(self, section, dependencies=[]):
        self.section = section
        self.dependencies = dependencies

    def list(self, project, storage):
        return storage.get_all(self.section, project, with_id=True, with_manual=True, with_locked=True)

    @requires_json
    def add(self, project, storage):
        data = request.json
        manual = data.get('_manual', False)
        locked = data.get('_locked', False)
        id = storage.add(self.section, project, data)
        response.status = 201
        data['_id'] = id
        data['_manual'] = manual
        data['_locked'] = locked
        return data

    def get(self, project, id, storage):
        data = storage.get(id, self.section,project)
        if not data:
            response.status = 404
        else:
            return data

    @requires_json
    def update(self, project, id, storage):
        data = request.json
        manual = data.get('_manual', False)
        locked = data.get('_locked', False)
        # used deepcopy cause storage.update modifies data
        storage.update(id, self.section, project, deepcopy(data))
        response.status = 200
        data['_manual'] = manual
        data['_locked'] = locked
        return data

    def delete(self, project, id, storage):
        if self.dependencies:
            look_for = {}
            for dependency in self.dependencies:
                section, field = dependency.split('.')
                look_for[section] = field
            result = storage.check_dependencies(id, look_for)

            if result:
                response.status = 405
                return result

        if storage.delete(id, self.section, project):
            response.status = 204
        else:
            response.status = 404

    def setup_routing(self, app):
        app.route('/conf/<project>/%s' % self.section, 'GET', self.list)
        app.route('/conf/<project>/%s' % self.section, 'POST', self.add)
        app.route('/conf/<project>/%s/<id:int>' % self.section, 'GET', self.get)
        app.route('/conf/<project>/%s/<id:int>' % self.section, 'PUT', self.update)
        app.route('/conf/<project>/%s/<id:int>' % self.section, 'DELETE', self.delete)

class RESTWMSCapabilities(RESTBase):
    def __init__(self):
        RESTBase.__init__(self, 'wms_capabilities')

    @requires_json
    def add(self, project, storage):
        url = request.json.get('data', {}).get('url')
        cap = {}
        if not url:
            response.status = 400
            return {'error': _('missing URL')}
        try:
            cap['data'] = parse_capabilities_url(url)
        except ParseError:
            response.status = 400
            return {'error': _('no capabilities document found')}
        except (http.HTTPClientError, ):
            response.status = 400
            # TODO
            return {'error': _('invalid URL')}

        search = """%%"url": "%s"%%""" % cap['data']['url']
        id = storage.exists_in_data(self.section, project, search)
        if id:
            return self.update(project, id, storage)

        id = storage.add(self.section, project, cap)
        cap['_id'] = id
        response.status = 201
        return cap

    @requires_json
    def update(self, project, id, storage):
        url = request.json.get('data', {}).get('url')
        if not url:
            response.status = 400
            return {'error': _('missing URL')}
        cap = {}
        cap['data'] = parse_capabilities_url(url)
        storage.update(id, self.section, project, cap)
        response.status = 200
        cap['_id'] = id
        return cap

class RESTLayers(RESTBase):
    def __init__(self):
        RESTBase.__init__(self, 'layers')

    def list(self, project, storage):
        return storage.get_all(self.section, project, with_rank=True, with_id=True, with_manual=True, with_locked=True)

    @requires_json
    def update_tree(self, project, storage):
        data = request.json
        storage.updates(self.section, project, data['tree'])
        response.status = 200

    def setup_routing(self, app):
        super(RESTLayers, self).setup_routing(app)
        app.route('/conf/<project>/%s' % self.section, 'PUT', self.update_tree)

class RESTGrids(RESTBase):
    def __init__(self):
        RESTBase.__init__(self, 'grids', ['caches.grids'])

    def list(self, project, storage):
        default_grids = {
            'GLOBAL_GEODETIC': {'_id': 'GLOBAL_GEODETIC', 'default': True, 'data': {
                'name': 'GLOBAL_GEODETIC',
                'srs': 'EPSG:4326',
                'bbox': [-180, -90, 180, 90],
                'bbox_srs': 'EPSG:4326',
                'origin': 'sw',
                'res': [
                    1.40625,
                    0.703125,
                    0.3515625,
                    0.17578125,
                    0.087890625,
                    0.0439453125,
                    0.02197265625,
                    0.010986328125,
                    0.0054931640625,
                    0.00274658203125,
                    0.001373291015625,
                    0.0006866455078125,
                    0.00034332275390625,
                    0.000171661376953125,
                    0.0000858306884765625,
                    0.00004291534423828125,
                    0.000021457672119140625,
                    0.000010728836059570312,
                    0.000005364418029785156,
                    0.000002682209014892578,
                ]
            }},
            'GLOBAL_MERCATOR': {'_id': 'GLOBAL_MERCATOR', 'default': True, 'data': {
                'name': 'GLOBAL_MERCATOR',
                'srs': 'EPSG:900913',
                'bbox': [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244],
                'bbox_srs': 'EPSG:900913',
                'origin': 'sw',
                'res': [
                    156543.03392804097,
                    78271.51696402048,
                    39135.75848201024,
                    19567.87924100512,
                    9783.93962050256,
                    4891.96981025128,
                    2445.98490512564,
                    1222.99245256282,
                    611.49622628141,
                    305.748113140705,
                    152.8740565703525,
                    76.43702828517625,
                    38.21851414258813,
                    19.109257071294063,
                    9.554628535647032,
                    4.777314267823516,
                    2.388657133911758,
                    1.194328566955879,
                    0.5971642834779395,
                    0.29858214173896974,
                ]
            }},
            'GLOBAL_WEBMERCATOR': {'_id': 'GLOBAL_WEBMERCATOR', 'default': True, 'data': {
                'name': 'GLOBAL_WEBMERCATOR',
                'srs': 'EPSG:3857',
                'bbox': [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244],
                'bbox_srs': 'EPSG:3857',
                'origin': 'nw',
                'res': [
                    156543.03392804097,
                    78271.51696402048,
                    39135.75848201024,
                    19567.87924100512,
                    9783.93962050256,
                    4891.96981025128,
                    2445.98490512564,
                    1222.99245256282,
                    611.49622628141,
                    305.748113140705,
                    152.8740565703525,
                    76.43702828517625,
                    38.21851414258813,
                    19.109257071294063,
                    9.554628535647032,
                    4.777314267823516,
                    2.388657133911758,
                    1.194328566955879,
                    0.5971642834779395,
                    0.29858214173896974,
                ]
            }}
        }
        default_grids.update(storage.get_all(self.section, project, with_id=True, with_manual=True, with_locked=True))
        return default_grids

rest_sources = RESTBase('sources', ['caches.sources', 'layers.sources'])
rest_sources.setup_routing(app)
rest_caches = RESTBase('caches', ['caches.sources', 'layers.sources'])
rest_caches.setup_routing(app)
rest_globals = RESTBase('globals')
rest_globals.setup_routing(app)
rest_services = RESTBase('services')
rest_services.setup_routing(app)
rest_defaults = RESTBase('defaults')
rest_defaults.setup_routing(app)
rest_wms_capabilities = RESTWMSCapabilities()
rest_wms_capabilities.setup_routing(app)
rest_layers = RESTLayers()
rest_layers.setup_routing(app)
rest_grids = RESTGrids()
rest_grids.setup_routing(app)

## other

@app.route('/', name='index')
def index():
    return template('index')

@app.route('/projects', name='projects')
def projects(storage):
    projects = {}
    for project in storage.get_projects():
        try:
            mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
        except config.ConfigError as e:
            informal_only = False
            errors = [e]
            mapproxy_conf = False
        if mapproxy_conf:
            errors, informal_only = config.validate(mapproxy_conf)
        projects[project] = {
            'valid': informal_only,
            'errors': errors
        }
    return template('projects', projects=projects)

@app.route('/project/<project>/conf', name='configuration')
@require_project
def conf_index(project):
    return template('config_index', project=project)

@app.route('/project/<project>', name='project_index')
@require_project
def project_index(project, storage):
    defaults = json.dumps(rest_defaults.list(project, storage))
    return template('project_index', project=project, defaults=defaults)

@app.route('/project/<project>/conf/sources', name='sources')
@require_project
def sources(project, storage):
    wms_capabilities = json.dumps(rest_wms_capabilities.list(project, storage))
    sources = json.dumps(rest_sources.list(project, storage))
    caches = json.dumps(rest_caches.list(project, storage))
    defaults = json.dumps(rest_defaults.list(project, storage))
    return template('sources', project=project, wms_capabilities=wms_capabilities, sources=sources, caches=caches, defaults=defaults)

@app.route('/project/<project>/conf/grids', name='grids')
@require_project
def grids(project, storage):
    grids = json.dumps(rest_grids.list(project, storage))
    defaults = json.dumps(rest_defaults.list(project, storage))
    return template('grids', project=project, grids=grids, defaults=defaults)

@app.route('/project/<project>/conf/caches', name='caches')
@require_project
def caches(project, storage):
    sources = json.dumps(rest_sources.list(project, storage))
    caches = json.dumps(rest_caches.list(project, storage))
    grids = json.dumps(rest_grids.list(project, storage))
    return template('caches', project=project, sources=sources, caches=caches, grids=grids)

@app.route('/project/<project>/conf/layers', name='layers')
@require_project
def layers(project, storage):
    sources = json.dumps(rest_sources.list(project, storage))
    caches = json.dumps(rest_caches.list(project, storage))
    layers = json.dumps(rest_layers.list(project, storage))
    grids = json.dumps(rest_grids.list(project, storage))
    defaults = json.dumps(rest_defaults.list(project, storage))
    return template('layers', project=project, sources=sources, caches=caches, layers=layers, grids=grids, defaults=defaults)

@app.route('/project/<project>/conf/globals', name='globals')
@require_project
def globals(project, storage):
    _globals = json.dumps(rest_globals.list(project, storage))
    return template('globals', project=project, _globals=_globals)

@app.route('/project/<project>/conf/services', name='services')
@require_project
def services(project, storage):
    defaults = json.dumps(rest_defaults.list(project, storage))
    services = json.dumps(rest_services.list(project, storage))
    return template('services', project=project, defaults=defaults, services=services)

@app.route('/conf/<project>/write_config', 'POST', name='write_config')
@require_project
def write_config(project, storage):
    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    try:
        config.write_mapproxy_yaml(mapproxy_conf, os.path.join(configuration.get('app', 'output_path'), project + '.yaml'))
        return {'success': _('creating mapproxy config successful')}
    except:
        response.status = 400
        return {'error': _('creating mapproxy config failed')}


@app.route('/static/<filepath:path>', name='static')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/template/<filename>', name='angular_template')
def angular_template(filename):
    return template(os.path.join(os.path.dirname(__file__), 'templates/angular', filename))

@app.route('/resources/<filename>', name='resource')
def resources(filename):
    file_location = os.path.join(os.path.dirname(__file__), 'templates/resources')
    return template(os.path.join(file_location, filename))

@app.route('/yaml', 'POST', name='json_to_yaml')
def create_yaml():
    data = request.json
    try:
        return yaml.safe_dump(data, default_flow_style=False)
    except yaml.YAMLError:
        response.status = 400
        return {'error': _('creating yaml failed')}

@app.route('/json', 'POST', name='yaml_to_json')
def create_json():
    data = request.json
    try:
        return yaml.load(data['yaml'])
    except yaml.YAMLError:
        response.status = 400
        return {'error': _('parsing yaml failed')}

@app.route('/res', 'POST', name='scales_to_res')
@app.route('/scales', 'POST', name='res_to_scales')
def convert_res_scales():
    data = request.json.get('data', [])
    mode = request.json.get('mode', 'to_scale')
    dpi = float(request.json.get('dpi', OGC_DPI))
    units = request.json.get('units', 'm')
    data = [float(d) if d else None for d in data]
    units = 1 if units == 'm' else UNIT_FACTOR
    convert = res_to_scale if mode == 'to_scale' else scale_to_res

    result = []
    for i, d in enumerate(data):
        result.append(round(convert(d, dpi, units),9) if d else None)

    return {'result': result}

@app.route('/calculate_tiles', 'POST', name='calculate_tiles')
def calculate_tiles():
    data = request.json

    origin = data.get('origin', None)
    name = data.get('name', None)
    srs = data.get('srs', None)
    bbox = data.get('bbox', None)
    bbox_srs = data.get('bbox_srs', None)

    if bbox is not None and not all(bbox):
        bbox = None
    dpi = float(data.get('dpi', OGC_DPI))
    units = 1 if data.get('units', 'm') == 'm' else UNIT_FACTOR

    res = data.get('res', None)
    if res:
        res = [float(r) for r in res]

    scales = data.get('scales', None)
    if scales:
        scales = [float(s) for s in scales]

    if res is None and scales is not None:
        res = [round(scale_to_res(scale, dpi, units), 9) for scale in scales]

    tilegrid = tile_grid(srs=srs, bbox=bbox, bbox_srs=bbox_srs, res=res, origin=origin, name=name)

    result = []

    for level, res in enumerate(tilegrid.resolutions):
        tiles_in_x, tiles_in_y = tilegrid.grid_sizes[level]
        total_tiles = tiles_in_x * tiles_in_y
        result.append({
            'level': level,
            'resolution': res,
            'scale': scales[level] if scales else res_to_scale(res, dpi, units),
            'tiles_in_x': tiles_in_x,
            'tiles_in_y': tiles_in_y,
            'total_tiles': total_tiles
        })
    return {'result': result}

@app.route('/get_max_extent', 'POST', name='get_max_extent')
def get_max_extent():
    extent = request.json.get('extent', [-180, -90, 180, 90])
    extent_srs = request.json.get('extent_srs', 'EPSG:4326')
    fallback_extent = request.json.get('fallback_extent', None)
    fallback_extent_srs = request.json.get('fallback_extent_srs', None)
    fallback_with_buffer = request.json.get('fallback_with_buffer', True)
    map_srs = request.json.get('map_srs')

    bounds = extent
    bounds_srs = extent_srs

    extent_srs = SRS(extent_srs)
    map_srs = SRS(map_srs)

    extent = extent_srs.align_bbox(extent)
    map_extent = transform_bbox(extent, extent_srs, map_srs)

    if not map_extent and fallback_extent:
        bounds = fallback_extent
        bounds_srs = fallback_extent_srs
        fallback_extent_srs = SRS(fallback_extent_srs)
        fallback_extent = fallback_extent_srs.align_bbox(fallback_extent)

        buffer_in_percent = 10 if fallback_with_buffer else 0
        map_extent = transform_bbox(buffered_extent(fallback_extent, buffer_in_percent), fallback_extent_srs, map_srs)
        while not map_extent and buffer_in_percent >= 0:
            buffer_in_percent -= 1;
            map_extent = transform_bbox(buffered_extent(fallback_extent, buffer_in_percent), fallback_extent_srs, map_srs)

    if map_extent:
        return {'result': {
            'maxExtent': map_extent
        }}
    else:
        response.status = 400
        return {'error': _('Can not show map in %(srs)s with bounds %(bounds)s (%(bounds_srs)s)') % ({
            'srs': map_srs.srs_code,
            'bounds': bounds,
            'bounds_srs': bounds_srs
        })}

def buffered_extent(extent, buffer):
    x0, y0, x1, y1 = extent
    xb0 = x0 - abs(x0 / 100 * buffer)
    yb0 = y0 - abs(y0 / 100 * buffer)
    xb1 = x1 + abs(x1 / 100 * buffer)
    yb1 = y1 + abs(y1 / 100 * buffer)
    return [xb0, yb0, xb1, yb1]

def transform_bbox(bbox, source, dest):
    if is_valid_transformation(bbox, source, dest):
        transformed_bbox = source.transform_bbox_to(dest, bbox)
        return transformed_bbox
    else:
        return False

def is_valid_transformation(bbox, source_srs, dest_srs):
    """
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(25833)
    >>> bbox = [8,54,10,56]
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    True
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(25833)
    >>> bbox = [-15,54,-13,56]
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    False
    """
    # delta in m
    delta = 50
    # delta in deg or m
    delta = delta * M_TO_DEG_FACTOR if source_srs.is_latlong else delta

    x0, y0, x1, y1 = bbox
    p1 = (x0, y0)
    p2 = (x1, y1)

    pd1, pd2 = list(source_srs.transform_to(dest_srs, [p1, p2]))

    if not float('inf') in pd1 + pd2:
        ps1, ps2 = list(dest_srs.transform_to(source_srs, [pd1, pd2]))
        bbox_t = list(ps1 + ps2)
        if not float('inf') in bbox_t:
            for i in range(4):
                if abs(bbox[i] - bbox_t[i]) > delta:
                    return False
            return True
    return False

@app.route('/transform_grid', 'POST', name='transform_grid')
def transform_grid():
    def return_map_message(points, message):
        return {"type":"FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        points
                    ]
                },
                "properties": {
                    "message": message
                }
            }]
        }

    request_bbox = request.forms.get('bbox', '').split(',')
    if request_bbox:
        request_bbox = map(float, request_bbox)
    else:
        request_bbox = None

    grid_bbox =request.forms.get('grid_bbox', None)

    if grid_bbox:
        grid_bbox = grid_bbox.split(',')
        if grid_bbox:
            grid_bbox = map(float, grid_bbox)
    else:
        grid_bbox = None

    level = request.forms.get('level', None)
    if level:
        level = int(level)

    grid_srs = request.forms.get('srs', None)
    if grid_srs:
        grid_srs = SRS(grid_srs)

    grid_bbox_srs = request.forms.get('bbox_srs', None)
    if grid_bbox_srs:
        grid_bbox_srs = SRS(grid_bbox_srs)

    map_srs = request.forms.get('map_srs', None)
    if map_srs:
        map_srs = SRS(map_srs)

    res = request.forms.get('res', None)
    if res:
        res = map(float, res.split(','))

    scales = request.forms.get('scales', None)
    if scales:
        scales = map(float, scales.split(','))
        units = 1 if request.forms.get('units', 'm') == 'm' else UNIT_FACTOR
        dpi = float(request.forms.get('dpi', OGC_DPI))
        res = [scale_to_res(scale, dpi, units) for scale in scales]

    origin = request.forms.get('origin', 'll')

    try:
        tilegrid = tile_grid(srs=grid_srs, bbox=grid_bbox, bbox_srs=grid_bbox_srs, origin=origin, res=res)
    except (ValueError, TransformationError):
        x0, y0, x1, y1 = request_bbox
        return return_map_message([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], _('Given bbox can not be used with given SRS'))

    if grid_bbox is None:
        grid_bbox = tilegrid.bbox
    else:
        grid_bbox = grid_bbox_srs.transform_bbox_to(grid_srs, grid_bbox) if grid_bbox_srs and grid_srs else grid_bbox

    if map_srs and grid_srs:
        if is_valid_transformation(request_bbox, map_srs, grid_srs):
            view_bbox = map_srs.transform_bbox_to(grid_srs, map_srs.align_bbox(request_bbox))
        else:
            view_bbox = grid_bbox
    else:
        view_bbox = request_bbox
    view_bbox = [
        max(grid_bbox[0], view_bbox[0]),
        max(grid_bbox[1], view_bbox[1]),
        min(grid_bbox[2], view_bbox[2]),
        min(grid_bbox[3], view_bbox[3])
    ]

    try:
        tiles_bbox, size, tiles = tilegrid.get_affected_level_tiles(bbox=view_bbox, level=level)
    except GridError:
        x0, y0, x1, y1 = request_bbox
        return return_map_message([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], _('Given bbox can not be used with given SRS'))

    feature_count = size[0] * size[1]
    features = []

    if feature_count > 1000:
        polygon = generate_envelope_points(grid_srs.align_bbox(tiles_bbox), 128)
        polygon = list(grid_srs.transform_to(map_srs, polygon)) if map_srs and grid_srs else list(polygon)
        return return_map_message([list(point) for point in polygon] + [list(polygon[0])], _("Too many tiles. Please zoom in."))

    else:
        for tile in tiles:
            if tile:
                x, y, z = tile
                tile_bbox = grid_srs.align_bbox(tilegrid.tile_bbox(tile))
                polygon = generate_envelope_points(tile_bbox, 16)
                polygon = list(grid_srs.transform_to(map_srs, polygon)) if map_srs and grid_srs else list(polygon)

                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [list(point) for point in polygon] + [list(polygon[0])]
                        ]
                    }
                })

                if feature_count == 1:
                    xv0, yv0, xv1, yv1 = view_bbox
                    xt0, yt0, xt1, yt1 = tile_bbox
                    xtc = xt0 + (xt1-xt0) /2
                    ytc = yt0 + (yt1-yt0)/2
                    if(xv0 <= xtc and xv1 >= xtc and yv0 <= ytc and yv1 >= ytc):
                        label_point = [xtc, ytc]
                    else:
                        label_point = [xv0 + (xv1-xv0) /2, yv0 + (yv1-yv0)/2]


                    features.append({
                        "type": "Feature",
                        "properties": {
                            "x": x,
                            "y": y,
                            "z": z
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": grid_srs.transform_to(map_srs, label_point) if map_srs and grid_srs else label_point
                        }
                    })
                elif feature_count <= 100:
                    xc0, yc0, xc1, yc1 = grid_srs.transform_bbox_to(map_srs, tile_bbox) if map_srs and grid_srs else tile_bbox
                    features.append({
                        "type": "Feature",
                        "properties": {
                            "x": x,
                            "y": y,
                            "z": z
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [xc0 + (xc1-xc0) /2, yc0 + (yc1-yc0)/2]
                        }
                    })



    return {"type":"FeatureCollection",
        "features": features
    }

@app.route('/create_project/<name>/<demo>', 'GET', name='create_project', demo=False)
def create_project(name, storage, demo):
    if demo:
        name = str(uuid4()).replace('-', '')

    storage._init_project(name)
    redirect(app.get_url('project_index', project=name))


def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)
