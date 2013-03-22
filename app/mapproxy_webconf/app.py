import os
from copy import deepcopy

from xml.etree.ElementTree import ParseError
from requests.exceptions import MissingSchema, ConnectionError

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

class RESTBase(object):
    def __init__(self, section):
        self.section = section

    def list(self, project, storage):
        return storage.get_all(self.section, project, with_id=True)

    @requires_json
    def add(self, project, storage):
        data = request.json
        id = storage.add(self.section, project, data)
        response.status = 201
        data['_id'] = id
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
        # used deepcopy cause storage.update modifies data
        storage.update(id, self.section, project, deepcopy(data))
        response.status = 200
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
        url = request.json.get('url')
        if not url:
            response.status = 400
            return {'error': 'missing URL'}
        try:
            cap = parse_capabilities_url(url)
        except ParseError:
            response.status = 400
            return {'error': 'no capabilities document found'}
        except (MissingSchema, ConnectionError):
            response.status = 400
            return {'error': 'invalid URL'}

        search = """%%"url": "%s"%%""" % cap['url']
        id = storage.exists_in_data(self.section, project, search)
        if id:
            return self.update(project, id, storage)

        id = storage.add(self.section, project, cap)
        cap['_id'] = id
        response.status = 201
        return cap

    @requires_json
    def update(self, project, id, storage):
        url = request.json.get('url')
        if not url:
            response.status = 400
            return {'error': 'missing URL'}

        cap = parse_capabilities_url(url)
        storage.update(id, self.section, project, cap)
        response.status = 200
        cap['_id'] = id
        return cap

class RESTLayers(RESTBase):
    def __init__(self):
        RESTBase.__init__(self, 'layers')

    def list(self, project, storage):
        return storage.get_all(self.section, project, with_rank=True, with_id=True)

    @requires_json
    def update_tree(self, project, storage):
        data = request.json
        storage.updates(self.section, project, data['tree'])
        response.status = 200

    def setup_routing(self, app):
        super(RESTLayers, self).setup_routing(app)
        app.route('/conf/<project>/%s' % self.section, 'PUT', self.update_tree)

RESTBase('sources').setup_routing(app)
RESTBase('caches').setup_routing(app)
RESTBase('grids').setup_routing(app)
RESTBase('globals').setup_routing(app)
RESTBase('services').setup_routing(app)
RESTWMSCapabilities().setup_routing(app)
RESTLayers().setup_routing(app)

## other

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return storage.get_all('services', project, with_id=True)

@app.route('/', name='index')
def index():
    return template('index')

@app.route('/project/<project>/conf', name='configuration')
def conf_index(project):
    return template('project_index', project=project)

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

@app.route('/project/<project>/conf/yaml', name='yaml')
def yaml(project):
    return template('yaml', project=project)

@app.route('/static/<filepath:path>', name='static')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/conf/<project>/yaml', 'GET')
def write_config(project, storage):
    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    return config.write_mapproxy_yaml(mapproxy_conf, os.path.join(configuration.get('app', 'output_path'), project + '.yaml'))

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(configuration.get('app', 'storage_path'), configuration.get('app', 'sqlite_db'))))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)