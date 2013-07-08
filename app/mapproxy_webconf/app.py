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
from mapproxy.srs import SRS
from mapproxy.grid import tile_grid

from . import bottle
from . import config
from . import storage
from . import defaults
from .bottle import request, response, static_file, template, SimpleTemplate, redirect, abort
from .utils import requires_json
from .capabilities import parse_capabilities_url
from .constants import OGC_DPI, UNIT_FACTOR

from .lib.geojson import ConfigGeoJSONGrid, features
from .lib.grid import is_valid_transformation, InvalidTransformationException

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
            result = storage.check_dependencies(id, project, look_for)

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
            storage.update(id, self.section, project, cap)
        else:
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
        default_grids = deepcopy(defaults.GRIDS.copy())
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

@app.route('/project/<project>', name='project_defaults')
@require_project
def project_defaults(project, storage):
    defaults = json.dumps(rest_defaults.list(project, storage))
    return template('project_defaults', project=project, defaults=defaults)

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
    if configuration.get_bool('app', 'demo'):
        abort(500)

    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    try:
        config.write_mapproxy_yaml(mapproxy_conf, os.path.join(configuration.get('app', 'output_path'), project + '.yaml'))
        return {'success': _('creating mapproxy config successful')}
    except:
        response.status = 400
        return {'error': _('creating mapproxy config failed')}


@app.route('/favicon.ico')
def get_favicon():
    return static('favicon.ico')

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
        result.append(round(convert(d, dpi, units), defaults.DECIMAL_PLACES) if d else None)

    return {'result': result}

@app.route('/calculate_tiles', 'POST', name='calculate_tiles')
def calculate_tiles():
    data = request.json

    if not data:
        response.status = 400
        return {'error': _('Missing data')}

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
        res = [round(scale_to_res(scale, dpi, units), defaults.DECIMAL_PLACES) for scale in scales]

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

@app.route('/transform_bbox', 'POST', name="transform_bbox")
def transform_bbox():
    source = SRS(request.json.get('source'));
    dest = SRS(request.json.get('dest'));
    bbox = source.align_bbox(request.json.get('bbox'));

    if is_valid_transformation(bbox, source, dest):
        transformed_bbox = source.transform_bbox_to(dest, bbox)
        return {'bbox': transformed_bbox}
    else:
        response.status = 400;
        return {'error': 'Could not transform bbox'}

def prepare_grid_params(params):
    grid_params = {}

    request_bbox = params.get('bbox', None)
    if request_bbox:
        request_bbox = request_bbox.split(',')
    grid_params['request_bbox'] = request_bbox

    grid_bbox = params.get('grid_bbox', None)

    if type(grid_bbox) == str:
        grid_bbox = grid_bbox.split(',')
    grid_params['grid_bbox'] = grid_bbox

    res = params.get('res', None)
    if res and type(res) == str:
        res = res.split(',')
    grid_params['res'] = res

    scales = params.get('scales', None)
    if scales and type(scales) == str:
        scales = scales.split(',')
    grid_params['scales'] = scales

    grid_params['level'] = params.get('level', None)
    grid_params['grid_srs'] = params.get('srs', None)
    grid_params['grid_bbox_srs'] = params.get('bbox_srs', None)
    grid_params['map_srs'] = params.get('map_srs', None)
    grid_params['origin'] = params.get('origin', 'll')
    grid_params['units'] = params.get('units', 'm')
    grid_params['dpi'] = params.get('dpi', None)

    return grid_params

@app.route('/grid_as_geojson', 'POST', name='grid_as_geojson')
def grid_as_geojson():
    grid_params = prepare_grid_params(request.forms)
    config = ConfigGeoJSONGrid(**grid_params)
    return {"type":"FeatureCollection",
        "features": features(config)
    }

@app.route('/validate_grid_params', 'POST', name='validate_grid_params')
def validate_grid_params():
    grid_params = prepare_grid_params(request.json)
    config = ConfigGeoJSONGrid(**grid_params)
    try:
        config.grid_bbox
        return {'scales': config.scales}
    except InvalidTransformationException:
        response.status = 400
        return {'error': _('Given grid bbox is invalid for used grid srs')}

@app.route('/project/create', ['GET', 'POST'], name='create_project')
def create_project(storage):
    if request.query.get('demo', False):
        name = str(uuid4()).replace('-', '')
        storage._init_project(name)
        redirect(app.get_url('configuration', project=name))
    else:
        name = request.json.get('name')
        if not name or storage.exist_project(name):
            response.status = 400
            return {'error': _('Project "%(name)s" already exists') % ({'name': name})}
        else:
            storage._init_project(name)
            return {'url': app.get_url('configuration', project=name)}

@app.route('/project/delete', 'GET', name='delete_project')
def delete_project(storage):
    project = request.query.get('project', None)
    response.status = 404
    if project:
        if storage.delete_project(project):
            response.status = 204


def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)
