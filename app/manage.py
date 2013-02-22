import sys
import scriptine
from mapproxy_webconf.app import init_app

def runserver_command(host='localhost', port=8080):
    sys.argv.insert(1, 'runserver') # required by reloader
    app = init_app('./')
    app.run(host=host, port=port, debug=True, reloader=True)

if __name__ == '__main__':
    scriptine.run()