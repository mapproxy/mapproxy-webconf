import bottle
from bottle import request, response
import storage

app = bottle.Bottle()

@app.route('/grids')
def grids_list(storage):
    return {'grids': storage.get('grids')}

@app.route('/sources')
def sources_list(storage):
    return {'sources': storage.get('sources')}

@app.route('/caches')
def caches_list(storage):
    return {'caches': storage.get('caches')}

@app.route('/globals')
def globals_list(storage):
    return {'globals': storage.get('globals')}

@app.route('/services')
def services_list(storage):
    return {'services': storage.get('services')}

@app.route('/layers')
def layers_list(storage):
    return {'layers': storage.get('layers', [])}


@app.route('/wms')
def wms_list(storage):
    return storage.get('wms_sources')

@app.route('/wms', method="POST")
def wms_post(storage):
    sources = storage.get('wms_sources')
    sources.setdefault('servers', []).append(request.json)
    storage.put('wms_sources', sources)
    response.status = 201

def init_app(storage_dir):
    app.install(storage.YAMLStorePlugin(storage_dir))
    return app

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True, reloader=True)