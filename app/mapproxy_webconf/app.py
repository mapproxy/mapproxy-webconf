import os
import yaml
from copy import deepcopy

from xml.etree.ElementTree import ParseError

from mapproxy.client import http
from mapproxy.script.scales import scale_to_res, res_to_scale

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
            'GLOBAL_MERCATOR': {'_id': 'GLOBAL_MERCATOR', 'data': {'name': 'GLOBAL_MERCATOR'}, 'default': True},
            'GLOBAL_GEODETIC': {'_id': 'GLOBAL_GEODETIC', 'data': {'name': 'GLOBAL_GEODETIC'}, 'default': True}
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

@app.route('/project/<project>/conf/yaml', name='yaml')
def yaml_page(project):
    return template('yaml', project=project)

@app.route('/static/<filepath:path>', name='static')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/i18n/<filename>', name='i18n')
def i18n(filename):
    return static_file(filename, root=os.path.join(os.path.dirname(__file__), 'static/i18n'))

@app.route('/conf/<project>/yaml', 'GET')
def write_config(project, storage):
    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    return config.write_mapproxy_yaml(mapproxy_conf, os.path.join(configuration.get('app', 'output_path'), project + '.yaml'))

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
    dpi = request.json.get('dpi', (2.54/(0.00028 * 100)))
    units = request.json.get('units', 'm')
    data = [float(d) if d else None for d in data]
    units = 1 if units == 'm' else 111319.4907932736
    convert = res_to_scale if mode == 'to_scale' else scale_to_res

    result = []
    for i, d in enumerate(data):
        result.append(round(convert(d, dpi, units),9) if d else None)
    return {'result': result}

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)