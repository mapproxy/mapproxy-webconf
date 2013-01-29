import errno
import inspect
import os

import yaml

from bottle import PluginError

from mapproxy_webconf import utils

class YAMLStorePlugin(object):
    name = 'yamlstore'

    def __init__(self, storage_dir, keyword='storage'):
        self.storage = YAMLStore(storage_dir)
        self.keyword = keyword

    def setup(self, app):
        '''
        Make sure that other installed plugins don't affect the same keyword argument.
        '''
        for other in app.plugins:
            if not isinstance(other, YAMLStorePlugin):
                continue
            if other.keyword == self.keyword:
                raise PluginError("Found another YAMLStore plugin with conflicting settings (non-unique keyword).")

    def apply(self, callback, context):
        conf = context['config'].get('yamlstorage') or {}
        keyword = conf.get('keyword', self.keyword)

        # Test if the original callback accepts a 'db' keyword.
        # Ignore it if it does not need a database handle.
        args = inspect.getargspec(context['callback'])[0]
        if keyword not in args:
            return callback

        def wrapper(*args, **kwargs):
            # Add the storage as a keyword argument.
            kwargs[keyword] = self.storage

            return callback(*args, **kwargs)

        # Replace the route callback with the wrapped one.
        return wrapper

DEFAULT_VALUE = object()
class YAMLStore(object):
    def __init__(self, storage_dir):
        self.storage_dir = storage_dir

    def _filename(self, name):
        return os.path.join(self.storage_dir, name + '.yaml')

    def get(self, name, default=DEFAULT_VALUE):
        try:
            with open(self._filename(name), 'rb') as f:
                return yaml.load(f)
        except IOError, ex:
            if ex.errno == errno.ENOENT:
                if default is DEFAULT_VALUE:
                    return {}
                return default

    def put(self, name, data):
        content = yaml.dump(data)
        utils.save_atomic(self._filename(name), content)
