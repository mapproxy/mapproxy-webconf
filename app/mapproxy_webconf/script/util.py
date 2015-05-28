from __future__ import print_function

import optparse
import sys

from mapproxy.script.util import NonStrictOptionParser, parse_bind_address, print_items
from mapproxy_webconf.version import version

def serve_develop_command(args):
    parser = optparse.OptionParser("usage: %prog serve-develop [options] mapproxy.yaml")
    parser.add_option("-b", "--bind",
                      dest="address", default='127.0.0.1:8080',
                      help="Server socket [127.0.0.1:8080]. Use 0.0.0.0 for external access. :1234 to change port.")
    options, args = parser.parse_args(args)

    if len(args) != 2:
        parser.print_help()
        print("\nERROR: Configuration file required.")
        sys.exit(1)

    config_file = args[1]
    host, port = parse_bind_address(options.address)

    from mapproxy_webconf.app import make_wsgi_app

    try:
        app = make_wsgi_app(config_file)
    except Exception, ex:
        print("\nERROR: %s." % (ex))
        sys.exit(2)

    app.run(host=host, port=port, debug=True, reloader=True)

commands = {
    'serve-develop': {
        'func': serve_develop_command,
        'help': 'Run MapProxy Webconf as developmentent server.'
    }
}

def main():
    parser = NonStrictOptionParser("usage: %prog COMMAND [options]",
        add_help_option=False)
    options, args = parser.parse_args()

    if len(args) < 1 or args[0] in ('--help', '-h'):
        parser.print_help()
        print()
        print_items(commands)
        sys.exit(1)

    if len(args) == 1 and args[0] == '--version':
        print('MapProxy Webconf ' + version)
        sys.exit(1)

    command = args[0]
    if command not in commands:
        parser.print_help()
        print()
        print_items(commands)
        print('\nERROR: unknown command %s' % (command,), file=sys.stdout)
        sys.exit(1)

    args = sys.argv[0:1] + sys.argv[2:]
    commands[command]['func'](args)

if __name__ == '__main__':
    main()