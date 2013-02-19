import os
import bottle
from bottle import request, response
import storage

app = bottle.Bottle()

@app.route('/conf/<project>/grids')
def grids_list(project, storage):
    return {'grids': storage.get_all('grids', project)}

@app.route('/conf/<project>/sources')
def sources_list(project, storage):
    return {'sources': storage.get_all('sources', project)}

@app.route('/conf/<project>/caches')
def caches_list(project, storage):
    return {'caches': storage.get_all('caches', project)}

@app.route('/conf/<project>/globals')
def globals_list(project, storage):
    return {'globals': storage.get_all('globals', project)}

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return {'services': storage.get_all('services', project)}

@app.route('/conf/<project>/layers')
def layers_list(project, storage):
    return {'layers': storage.get_all('layers', project, [])}



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