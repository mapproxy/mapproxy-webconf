import os
import yaml
from copy import deepcopy

from xml.etree.ElementTree import ParseError

from mapproxy.client import http
from mapproxy.script.scales import scale_to_res, res_to_scale
from mapproxy.srs import SRS
from mapproxy.grid import tile_grid

from . import bottle
from . import config
from . import storage
from .bottle import request, response, static_file, template, SimpleTemplate
from .utils import requires_json
from .capabilities import parse_capabilities_url

configuration = config.ConfigParser.from_file('./config.ini')
LANGUAGE = configuration.get('app', 'language')

app = bottle.Bottle()
bottle.TEMPLATE_PATH = [os.path.join(os.path.dirname(__file__), 'templates')]
SimpleTemplate.defaults["get_url"] = app.get_url

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
            'GLOBAL_MERCATOR': {'_id': 'GLOBAL_MERCATOR', 'default': True, 'data': {
                'name': 'GLOBAL_MERCATOR',
                'srs': 'EPSG:900913'
            }},
            'GLOBAL_GEODETIC': {'_id': 'GLOBAL_GEODETIC', 'default': True, 'data': {
                'name': 'GLOBAL_GEODETIC',
                'srs': 'EPSG:4326'
            }},
            'GLOBAL_WEBMERCATOR': {'_id': 'GLOBAL_WEBMERCATOR', 'default': True, 'data': {
                'name': 'GLOBAL_WEBMERCATOR',
                'srs': 'EPSG:3857',
                'origin': 'nw'
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
    return template('index', language=LANGUAGE)

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
    return template('projects', projects=projects, language=LANGUAGE)

@app.route('/project/<project>/conf', name='configuration')
def conf_index(project):
    return template('config_index', project=project, language=LANGUAGE)

@app.route('/project/<project>', name='project_index')
def project_index(project):
    return template('project_index', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/sources', name='sources')
def sources(project):
    return template('sources', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/grids', name='grids')
def grids(project):
    return template('grids', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/caches', name='caches')
def caches(project):
    return template('caches', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/layers', name='layers')
def layers(project):
    return template('layers', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/globals', name='globals')
def globals(project):
    return template('globals', project=project, language=LANGUAGE)

@app.route('/project/<project>/conf/services', name='services')
def services(project):
    return template('services', project=project, language=LANGUAGE)

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

@app.route('/i18n/<filename>', name='i18n')
def i18n(filename):
    return static_file(filename, root=os.path.join(os.path.dirname(__file__), 'static/i18n'))

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

    tilegrid = tile_grid(srs=srs, bbox=bbox, res=res, origin=origin, name=name)

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
    bbox = request.forms.get('bbox', '').split(',')
    if bbox:
        bbox = map(float, bbox)
    else:
        bbox = None

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

    srs = request.forms.get('srs', None)
    bbox_srs = request.forms.get('bbox_srs', None)
    # res = map(float, request.forms.get('res', '').split(','))
    # if not res:
    #     res = None

    # scales = map(float, request.forms.get('scales', '').split(','))
    # if not scales:
    #     scales = None
    # unit = request.forms.get('unit', 'm')

    origin = request.forms.get('origin', 'll')

    tilegrid = tile_grid(srs=srs, bbox=grid_bbox, bbox_srs=bbox_srs, origin=origin)

    print 'bbox', bbox
    print 'grid_bbox', grid_bbox

    bbox = [
        max(grid_bbox[0], bbox[0]),
        max(grid_bbox[1], bbox[1]),
        min(grid_bbox[2], bbox[2]),
        min(grid_bbox[3], bbox[3])
    ]

    print 'new bbox', bbox

    _bbox, size, tiles = tilegrid.get_affected_level_tiles(bbox=bbox, level=level)

    feature_count = size[0] * size[1]

    if  feature_count> 2500:
        response.status = 400
        print feature_count
        return {'error': 'to many tiles (%s)' % feature_count}

    features = []

    for tile in tiles:
        if tile:
            x0, y0, x1, y1 = tilegrid.tile_bbox(tile)
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]
                    ]]
                }
            })

    return {"type":"FeatureCollection",
        "features": features
    }

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)
