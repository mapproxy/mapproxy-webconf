import os
import yaml
import gettext
from copy import deepcopy

from xml.etree.ElementTree import ParseError

from mapproxy.client import http
from mapproxy.script.scales import scale_to_res, res_to_scale
from mapproxy.srs import SRS, generate_envelope_points
from mapproxy.grid import tile_grid

from . import bottle
from . import config
from . import storage
from .bottle import request, response, static_file, template, SimpleTemplate
from .utils import requires_json
from .capabilities import parse_capabilities_url

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

class RESTBase(object):
    def __init__(self, section):
        self.section = section

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
            return {'error': 'missing URL'}
        try:
            cap['data'] = parse_capabilities_url(url)
        except ParseError:
            response.status = 400
            return {'error': 'no capabilities document found'}
        except (http.HTTPClientError, ):
            response.status = 400
            # TODO
            return {'error': 'invalid URL'}

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
            return {'error': 'missing URL'}
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
        RESTBase.__init__(self, 'grids')

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

RESTBase('sources').setup_routing(app)
RESTBase('caches').setup_routing(app)
RESTBase('globals').setup_routing(app)
RESTBase('services').setup_routing(app)
RESTBase('defaults').setup_routing(app)
RESTWMSCapabilities().setup_routing(app)
RESTLayers().setup_routing(app)
RESTGrids().setup_routing(app)

## other

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return storage.get_all('services', project, with_id=True)

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
def conf_index(project):
    return template('config_index', project=project)

@app.route('/project/<project>', name='project_index')
def project_index(project):
    return template('project_index', project=project)

@app.route('/project/<project>/conf/sources', name='sources')
def sources(project):
    return template('sources', project=project)

@app.route('/project/<project>/conf/grids', name='grids')
def grids(project):
    return template('grids', project=project)

@app.route('/project/<project>/conf/caches', name='caches')
def caches(project):
    return template('caches', project=project)

@app.route('/project/<project>/conf/layers', name='layers')
def layers(project):
    return template('layers', project=project)

@app.route('/project/<project>/conf/globals', name='globals')
def globals(project):
    return template('globals', project=project)

@app.route('/project/<project>/conf/services', name='services')
def services(project):
    return template('services', project=project)

@app.route('/conf/<project>/write_config', 'POST', name='write_config')
def write_config(project, storage):
    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    try:
        config.write_mapproxy_yaml(mapproxy_conf, os.path.join(configuration.get('app', 'output_path'), project + '.yaml'))
        return {'success': 'creating mapproxy config successful'}
    except:
        response.status = 400
        return {'error': 'creating mapproxy config failed'}


@app.route('/static/<filepath:path>', name='static')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/template/<filename>', name='angular_template')
def angular_template(filename):
    return template(os.path.join(os.path.dirname(__file__), 'templates/angular', filename))

@app.route('/resources/<filename>/<translated>', name='resource', translated=False)
def resources(filename, translated):
    file_location = os.path.join(os.path.dirname(__file__), 'templates/resources')
    if translated:
        return template(os.path.join(file_location, filename))
    else:
        return static_file(filename, root=file_location)

@app.route('/yaml', 'POST', name='json_to_yaml')
def create_yaml():
    data = request.json
    try:
        return yaml.safe_dump(data, default_flow_style=False)
    except yaml.YAMLError:
        response.status = 400
        return {'error': 'creating yaml failed'}

@app.route('/json', 'POST', name='yaml_to_json')
def create_json():
    data = request.json
    try:
        return yaml.load(data['yaml'])
    except yaml.YAMLError:
        response.status = 400
        return {'error': 'parsing yaml failed'}

@app.route('/res', 'POST', name='scales_to_res')
@app.route('/scales', 'POST', name='res_to_scales')
def convert_res_scales():
    data = request.json.get('data', [])
    mode = request.json.get('mode', 'to_scale')
    dpi = float(request.json.get('dpi', (2.54/(0.00028 * 100))))
    units = request.json.get('units', 'm')
    data = [float(d) if d else None for d in data]
    units = 1 if units == 'm' else 111319.4907932736
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
    dpi = float(data.get('dpi', (2.54/(0.00028 * 100))))
    units = 1 if data.get('units', 'm') == 'm' else 111319.4907932736

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
    res_scale = 'resolution' if scales is None else 'scale'
    for level, res in enumerate(tilegrid.resolutions):
        tiles_in_x, tiles_in_y = tilegrid.grid_sizes[level]
        total_tiles = tiles_in_x * tiles_in_y
        result.append({
            'level': level,
            res_scale: res if scales is None else res_to_scale(res, dpi, units),
            'tiles_in_x': tiles_in_x,
            'tiles_in_y': tiles_in_y,
            'total_tiles': total_tiles
        })
    return {'result': result}

@app.route('/transform_bbox', 'POST', name='transform_bbox')
def transform_bbox():
    bbox = request.json.get('bbox')
    source_srs = request.json.get('sourceSRS')
    dest_srs = request.json.get('destSRS')

    source = SRS(source_srs)
    dest = SRS(dest_srs)
    transformed_bbox = source.transform_bbox_to(dest, bbox)

    return {'result': transformed_bbox}

@app.route('/transform_grid', 'POST', name='transform_grid')
def transform_grid():
    view_bbox = request.forms.get('bbox', '').split(',')
    if view_bbox:
        view_bbox = map(float, view_bbox)
    else:
        view_bbox = None

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
        units = 1 if request.forms.get('units', 'm') == 'm' else 111319.4907932736
        dpi = float(request.forms.get('dpi', (2.54/(0.00028 * 100))))
        res = [scale_to_res(scale, dpi, units) for scale in scales]

    origin = request.forms.get('origin', 'll')

    tilegrid = tile_grid(srs=grid_srs, bbox=grid_bbox, bbox_srs=grid_bbox_srs, origin=origin, res=res)

    if grid_bbox is None:
        grid_bbox = tilegrid.bbox
    else:
        grid_bbox = grid_bbox_srs.transform_bbox_to(grid_srs, grid_bbox) if grid_bbox_srs and grid_srs else grid_bbox

    if map_srs and grid_srs:
        view_bbox = map_srs.transform_bbox_to(grid_srs, view_bbox)

    view_bbox = [
        max(grid_bbox[0], view_bbox[0]),
        max(grid_bbox[1], view_bbox[1]),
        min(grid_bbox[2], view_bbox[2]),
        min(grid_bbox[3], view_bbox[3])
    ]

    tiles_bbox, size, tiles = tilegrid.get_affected_level_tiles(bbox=view_bbox, level=level)

    feature_count = size[0] * size[1]
    features = []

    if feature_count > 1000:
        polygon = generate_envelope_points(grid_srs.align_bbox(tiles_bbox), 128)
        polygon = list(grid_srs.transform_to(map_srs, polygon)) if map_srs and grid_srs else list(polygon)

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [list(point) for point in polygon] + [list(polygon[0])]
                ]
            },
            "properties": {
                "message": "Too many tiles. Please zoom in."
            }
        })
    else:
        for tile in tiles:
            if tile:
                x, y, z = tile
                polygon = generate_envelope_points(grid_srs.align_bbox(tilegrid.tile_bbox(tile)), 16)
                polygon = list(grid_srs.transform_to(map_srs, polygon)) if map_srs and grid_srs else list(polygon)

                new_feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [list(point) for point in polygon] + [list(polygon[0])]
                        ]
                    }
                }
                if feature_count == 1:
                    xc0, yc0, xc1, yc1 = grid_srs.transform_bbox_to(map_srs, view_bbox) if map_srs and grid_srs else view_bbox
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
                elif feature_count <= 100:
                    new_feature["properties"] = {
                        "x": x,
                        "y": y,
                        "z": z
                    }
                features.append(new_feature)

    return {"type":"FeatureCollection",
        "features": features
    }

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)
