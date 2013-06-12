import sys
import scriptine
from scriptine.shell import sh
from mapproxy_webconf.app import init_app

def runserver_command(host='localhost', port=8080):
    sys.argv.insert(1, 'runserver') # required by reloader
    app = init_app('./')
    app.run(host=host, port=port, debug=True, reloader=True)

def extract_command():
    "Extract messages"
    sh('pygettext -a -v -k __ -d messages -o mapproxy_webconf/locale/messages.pot mapproxy_webconf/\*.py mapproxy_webconf/templates/\*.html mapproxy_webconf/ static/angular_templates/\*.html')
if __name__ == '__main__':
    scriptine.run()