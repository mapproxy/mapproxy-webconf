import errno
import inspect
import os
import sqlite3

import yaml
import json

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

    def get(self, name, project, default=DEFAULT_VALUE):
        try:
            with open(self._filename(name), 'rb') as f:
                data = yaml.load(f)
                project_data = data.get(project, default)
                if project_data is DEFAULT_VALUE:
                    return {}
                else:
                    return project_data
        except IOError, ex:
            if ex.errno == errno.ENOENT:
                if default is DEFAULT_VALUE:
                    return {}
                return default

    def put(self, name, project, data):
        content = yaml.dump({project: data})
        utils.save_atomic(self._filename(name), content)


class SQLiteStorePlugin(object):
    name = 'sqlitestore'

    def __init__(self, dbfile, keyword='storage'):
        self.storage = SQLiteStore(dbfile)
        self.keyword = keyword

    def setup(self, app):
        '''
        Make sure that other installed plugins don't affect the same keyword argument.
        '''
        for other in app.plugins:
            if not isinstance(other, SQLiteStorePlugin):
                continue
            if other.keyword == self.keyword:
                raise PluginError("Found another SQLiteStore plugin with conflicting settings (non-unique keyword).")

    def apply(self, callback, context):
        conf = context['config'].get('sqlitestore') or {}
        keyword = conf.get('keyword', self.keyword)

        # Test if the original callback accepts a 'storage' keyword.
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

class SQLiteStore(object):
    def __init__(self, filename):
        self.filename = filename
        self.db = sqlite3.connect(filename)
        self._init_db()

    def _init_db(self):
        self.db.execute("""
            CREATE TABLE store (
                id INTEGER PRIMARY KEY,
                name TEXT,
                section TEXT NOT NULL,
                project TEXT,
                data TEXT NOT NULL
            )
        """)

    def get_all(self, section, project, default=DEFAULT_VALUE):
        if default is DEFAULT_VALUE:
            default = {}

        result = default
        if hasattr(result, "append"):
            append_data = True
        else:
            append_data = False

        cur = self.db.cursor()
        cur.execute("SELECT id, name, data FROM store WHERE section = ? AND project = ?",
            (section, project))
        for row in cur.fetchall():
            print map(type, row)
            if append_data:
                result.append(json.loads(row[2]))
            else:
                result[row[1] or row[0]] = json.loads(row[2])
        return result

    def get(self, id, section, project):
        cur = self.db.cursor()
        cur.execute("SELECT data FROM store WHERE id = ? AND section = ? AND project = ?",
            (id, section, project))
        row = cur.fetchone()
        if row:
            return json.loads(row[0])

    def add(self, section, project, data):
        data = json.dumps(data)

        cur = self.db.cursor()
        cur.execute("INSERT INTO store (section, project, data) VALUES (?, ?, ?)",
            (section, project, data))
        return cur.lastrowid

    def update(self, id, section, project, data):
        data = json.dumps(data)

        cur = self.db.cursor()
        cur.execute("UPDATE store SET data = ? WHERE id = ? AND SECTION = ? AND project = ?",
            (data, id, section, project))
