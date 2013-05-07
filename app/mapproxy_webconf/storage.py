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
        self.db.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        self.db.execute("""
            PRAGMA foreign_keys = ON;
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS store (
                id INTEGER PRIMARY KEY,
                section TEXT NOT NULL,
                project TEXT,
                data TEXT NOT NULL,
                rank INTEGER,
                parent INTEGER,
                manual BOOLEAN,
                FOREIGN KEY(parent) REFERENCES store(id) ON DELETE CASCADE
            )
        """)

    def get_all(self, section, project, default=DEFAULT_VALUE, with_rank=False, with_id=False):
        if default is DEFAULT_VALUE:
            default = {}

        result = default
        if hasattr(result, "append"):
            append_data = True
        else:
            append_data = False

        cur = self.db.cursor()
        cur.execute("SELECT id, data, parent, rank, manual FROM store WHERE section = ? AND project = ?",
            (section, project))
        for row in cur.fetchall():
            data = json.loads(row['data'])
            data['_manual'] = row['manual']
            if with_id:
                data['_id'] = row['id']
            if with_rank:
                data['_parent'] = row['parent']
                data['_rank'] = row['rank']

            if append_data:
                result.append(data)
            else:
                result[row['id']] = data
        return result

    def get(self, id, section, project):
        cur = self.db.cursor()
        cur.execute("SELECT data, parent, rank FROM store WHERE id = ? AND section = ? AND project = ?",
            (id, section, project))
        row = cur.fetchone()
        if row:
            data = json.loads(row[0])
            if row[1] is not None:
                data['_parent'] = row[1]
            if row[2] is not None:
                data['_rank'] = row[2]
            return data

    def add(self, section, project, data):
        rank = data.pop('_rank', None)
        parent = data.pop('_parent', None)
        manual = data.pop('_manual', False)
        data.pop('_id', None)


        data = json.dumps(data)

        cur = self.db.cursor()
        cur.execute("INSERT INTO store (section, project, data, parent, rank, manual) VALUES (?, ?, ?, ?, ?, ?)",
            (section, project, data, parent, rank, manual))
        self.db.commit()
        return cur.lastrowid

    def update(self, id, section, project, data):
        rank = data.pop('_rank', None)
        parent = data.pop('_parent', None)
        manual = data.pop('_manual', False)
        data.pop('_id', None)
        data.pop('_layers', None)

        data = json.dumps(data)

        cur = self.db.cursor()
        cur.execute("UPDATE store SET data = ?, parent = ?, rank = ?, manual = ? WHERE id = ? AND SECTION = ? AND project = ?",
            (data, parent, rank, manual, id, section, project))
        self.db.commit()

    def updates(self, section, project, data):
        #ensure all needed values are present or None
        data = [{'id': d['_id'], 'rank': d['_rank'] if '_rank' in d else None, 'parent': d['_parent'] if '_parent' in d else None} for d in data if '_id' in d]
        cur = self.db.cursor()
        cur.executemany("UPDATE store SET parent = :parent, rank = :rank WHERE id = :id", data)
        self.db.commit()

    def delete(self, id, section, project):
        cur = self.db.cursor()
        cur.execute("DELETE FROM store WHERE id = ? AND SECTION = ? AND project = ?",
            (id, section, project))
        self.db.commit()
        return cur.rowcount == 1

    def exists_in_data(self, section, project, search):
        cur = self.db.cursor()
        cur.execute("SELECT id FROM store WHERE section = ? AND project = ? AND data LIKE ?", (section, project, search))
        row = cur.fetchone()
        return row[0] if row else False
