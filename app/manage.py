import sys
import scriptine
from scriptine.shell import sh
from mapproxy_webconf.app import init_app

def runserver_command(host='localhost', port=8080):
    sys.argv.insert(1, 'runserver') # required by reloader
    app = init_app('./')
    app.run(host=host, port=port, debug=True, reloader=True)


def babel_refresh_command():
    "Extract messages"
    sh("pybabel extract -F babel.cfg -o mapproxy_webconf/locale/messages.pot mapproxy_webconf")
    sh('pybabel update -i mapproxy_webconf/locale/messages.pot -d mapproxy_webconf/locale')

def babel_compile_command():
    "Compile messages"
    sh('pybabel compile -d mapproxy_webconf/locale')

if __name__ == '__main__':
    scriptine.run()
