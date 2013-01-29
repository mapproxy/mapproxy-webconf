import errno
import inspect
import os

import yaml

from bottle import PluginError

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

class YAMLStore(object):
    def __init__(self, storage_dir):
        self.storage_dir = storage_dir

    def _filename(self, name):
        return os.path.join(self.storage_dir, name + '.yaml')

    def get(self, name):
        try:
            with open(self._filename(name), 'rb') as f:
                return yaml.load(f)
        except IOError, ex:
            if ex.errno == errno.ENOENT:
                return {}

    def put(self, name, data):
        content = yaml.dump(data)
        save_atomic(self._filename(name), content)


def save_atomic(filename, content, makedirs=True):
    """
    Save `content` to `filename` atomicaly. This prevents others from
    reading half-written files.

    :param makedirs: create directories if needed
    """
    if makedirs:
        try:
            os.makedirs(os.path.dirname(filename))
        except OSError, ex:
            if ex.errno != errno.EEXIST:
                raise


    tmp_filename = filename + '~'
    with open(tmp_filename, 'wb') as f:
        f.write(content)
        f.flush()
        os.fsync(f.fileno())

    os.rename(tmp_filename, filename)
