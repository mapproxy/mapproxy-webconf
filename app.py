import os
import bottle
from bottle import request, response
import storage
import config

app = bottle.Bottle()

class RESTBase(object):
    section = None

    @classmethod
    def list(cls, project, storage):
        return storage.get_all(cls.section, project)

    @classmethod
    def add(cls, project, storage):
        try:
            data = request.json
        except ValueError:
            response.status = 400
            return {'error': 'invalid JSON data'}

        if not data:
            response.status = 400
            return {'error': 'missing JSON data'}

        id = storage.add(cls.section, project, data)
        response.status = 201
        data['_id'] = id
        return data

    @classmethod
    def get(cls, project, id, storage):
        data = storage.get(id, cls.section,project)
        if not data:
            response.status = 404
        else:
            return data

    @classmethod
    def update(cls, project, id, storage):
        data = request.json
        storage.update(id, cls.section, project, data)
        response.status = 200
        return data

    @classmethod
    def delete(cls, project, id, storage):
        if storage.delete(id, cls.section, project):
            response.status = 204
        else:
            response.status = 404

    @classmethod
    def setup_routing(cls, app):
        app.route('/conf/<project>/%s' % cls.section, 'GET', cls.list)
        app.route('/conf/<project>/%s' % cls.section, 'POST', cls.add)
        app.route('/conf/<project>/%s/<id:int>' % cls.section, 'GET', cls.get)
        app.route('/conf/<project>/%s/<id:int>' % cls.section, 'PUT', cls.update)
        app.route('/conf/<project>/%s/<id:int>' % cls.section, 'DELETE', cls.delete)


class SourcesAPI(RESTBase):
    section = 'sources'

class CachesAPI(RESTBase):
    section = 'caches'

class GridsAPI(RESTBase):
    section = 'grids'

SourcesAPI.setup_routing(app)
CachesAPI.setup_routing(app)
GridsAPI.setup_routing(app)

## other


@app.route('/conf/<project>/grids')
def grids_list(project, storage):
    return storage.get_all('grids', project)

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

def init_app(storage_dir):
    app.install(storage.SQLiteStorePlugin(os.path.join(storage_dir, 'mapproxy.sqlite')))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)