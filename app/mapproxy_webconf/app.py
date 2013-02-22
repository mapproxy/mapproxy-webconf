import os

from . import bottle
from . import config
from . import storage
from .bottle import request, response, static_file
from .utils import requires_json

app = bottle.Bottle()

class RESTBase(object):
    def __init__(self, section):
        self.section = section

    def list(self, project, storage):
        return storage.get_all(self.section, project)

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
    return storage.get_all('globals', project)

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return storage.get_all('services', project)

@app.route('/conf/<project>/layers')
def layers_list(project, storage):
    layers = storage.get_all('layers', project, with_rank=True)
    tree = config.layer_tree(layers)
    return {'tree': tree}

@app.route('/conf/<project>/layers', method='POST')
def layers_add(project, storage):
    data = request.json
    id = storage.add('layers', project, data)
    response.status = 201
    data['_id'] = id
    return data


@app.route('/conf/<project>/wms_capabilities')
def wms_list(project, storage):
    return storage.get_all('wms_capabilities', project)

@app.route('/conf/<project>/wms_capabilities', method="POST")
def wms_post(project, storage):
    storage.add('wms_capabilities', project, request.json)
    response.status = 201

@app.route('/')
def index():
    return static_file('index.html', root=os.path.join(os.path.dirname(__file__), 'static'))

@app.route('/static/<filepath:path>')
def static(filepath):
    return static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static'))

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(storage_dir, 'mapproxy.sqlite')))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)