import os
import bottle
from bottle import request, response
import storage
import config

app = bottle.Bottle()

## sources

@app.route('/conf/<project>/sources', method='GET')
def sources(project, storage):
    return storage.get_all('sources', project)

@app.route('/conf/<project>/sources', method='POST')
def source_add(project, storage):
    data = request.json
    id = storage.add('sources', project, data)
    response.status = 201
    data['_id'] = id
    return data

@app.route('/conf/<project>/sources/<id:int>', method='GET')
def source_get(project, id, storage):
    data = request.json
    data = storage.get(id, 'sources',project)
    if not data:
        response.status = 404
    else:
        return data

@app.route('/conf/<project>/sources/<id:int>', method='PUT')
def source_update(project, id, storage):
    data = request.json
    storage.update(id, 'sources', project, data)
    response.status = 200
    return data

@app.route('/conf/<project>/sources/<id:int>', method='DELETE')
def source_delete(project, id, storage):
    if storage.delete( id, 'sources', project):
        response.status = 204
    else:
        response.status = 404


## caches

@app.route('/conf/<project>/caches', method='GET')
def caches(project, storage):
    return storage.get_all('caches', project)

@app.route('/conf/<project>/caches', method='POST')
def cache_add(project, storage):
    data = request.json
    id = storage.add('caches', project, data)
    response.status = 201
    data['_id'] = id
    return data

@app.route('/conf/<project>/caches/<id:int>', method='GET')
def cache_get(project, id, storage):
    data = request.json
    data = storage.get(id, 'caches',project)
    if not data:
        response.status = 404
    else:
        return data

@app.route('/conf/<project>/caches/<id:int>', method='PUT')
def cache_update(project, id, storage):
    data = request.json
    storage.update(id, 'caches', project, data)
    response.status = 200
    return data

@app.route('/conf/<project>/caches/<id:int>', method='DELETE')
def cache_delete(project, id, storage):
    if storage.delete( id, 'caches', project):
        response.status = 204
    else:
        response.status = 404


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