import bottle
from bottle import request, response
import storage

app = bottle.Bottle()

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