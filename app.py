import bottle
from bottle import request, response
import storage

app = bottle.Bottle()

@app.route('/conf/<project>/grids')
def grids_list(project, storage):
    return {'grids': storage.get('grids', project)}

@app.route('/conf/<project>/sources')
def sources_list(project, storage):
    return {'sources': storage.get('sources', project)}

@app.route('/conf/<project>/caches')
def caches_list(project, storage):
    return {'caches': storage.get('caches', project)}

@app.route('/conf/<project>/globals')
def globals_list(project, storage):
    return {'globals': storage.get('globals', project)}

@app.route('/conf/<project>/services')
def services_list(project, storage):
    return {'services': storage.get('services', project)}

@app.route('/conf/<project>/layers')
def layers_list(project, storage):
    return {'layers': storage.get('layers', project, [])}



@app.route('/conf/<project>/wms_capabilities')
def wms_list(project, storage):
    return storage.get('wms_capabilities', project)

@app.route('/conf/<project>/wms_capabilities', method="POST")
def wms_post(project, storage):
    sources = storage.get('wms_capabilities', project)
    sources.setdefault('servers', []).append(request.json)
    storage.put('wms_capabilities', project, sources)
    response.status = 201

def init_app(storage_dir):
    app.install(storage.YAMLStorePlugin(storage_dir))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)