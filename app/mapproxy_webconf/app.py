import os

from . import bottle
from . import config
from . import storage
from .bottle import request, response, static_file
from .utils import requires_json
from .capabilities import parse_capabilities_url

app = bottle.Bottle()

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
        storage.update(id, self.section, project, data)
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

RESTBase('sources').setup_routing(app)
RESTBase('caches').setup_routing(app)
RESTBase('grids').setup_routing(app)

## other

@app.route('/conf/<project>/globals')
def globals_list(project, storage):
    return storage.get_all('globals', project, with_id=True)

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return storage.get_all('services', project, with_id=True)

@app.route('/conf/<project>/layers')
def layers_list(project, storage):
    return storage.get_all('layers', project, with_rank=True, with_id=True)

@app.route('/conf/<project>/layers', method='POST')
def layers_add(project, storage):
    data = request.json
    id = storage.add('layers', project, data)
    response.status = 201
    data['_id'] = id
    return data

@app.route('/conf/<project>/layers/<id:int>', method='PUT')
@requires_json
def update(project, id, storage):
    data = request.json
    storage.update(id, 'layers', project, data)
    response.status = 200
    return data

class RESTWMSCapabilities(RESTBase):
    def __init__(self):
        RESTBase.__init__(self, 'wms_capabilities')

    @requires_json
    def add(self, project, storage):
        url = request.json.get('url')
        print url
        if not url:
            response.status = 400
            return {'error': 'missing URL'}

        cap = parse_capabilities_url(url)
        id = storage.add(self.section, project, cap)
        cap['_id'] = id
        response.status = 201
        return cap

    @requires_json
    def update(self, project, id, storage):
        url = request.json.get('url')
        print url
        if not url:
            response.status = 400
            return {'error': 'missing URL'}

        cap = parse_capabilities_url(url)
        storage.update(id, self.section, project, cap)
        response.status = 200
        return cap

RESTWMSCapabilities().setup_routing(app)

@app.route('/')
def index():
    return static_file('index.html', root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/static/<filepath:path>')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/conf/<project>/yaml', 'GET')
def write_config(project, storage):
    mapproxy_conf = config.mapproxy_conf_from_storage(storage, project)
    return config.write_mapproxy_yaml(mapproxy_conf, '/tmp/test.yaml')

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(storage_dir, 'mapproxy.sqlite')))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)