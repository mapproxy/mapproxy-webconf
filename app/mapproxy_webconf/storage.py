import errno
import inspect
import os
import sqlite3
import yaml
import json

from .bottle import PluginError

from mapproxy_webconf import utils, defaults
from mapproxy_webconf.demo import DEMO_CONFIG

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
                raise PluginError(_("Found another YAMLStore plugin with conflicting settings (non-unique keyword)."))

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
        except IOError as ex:
            if ex.errno == errno.ENOENT:
                if default is DEFAULT_VALUE:
                    return {}
                return default

    def put(self, name, project, data):
        content = yaml.dump({project: data})
        utils.save_atomic(self._filename(name), content)


class SQLiteStorePlugin(object):
    name = 'sqlitestore'

    def __init__(self, dbfile, keyword='storage', test=False):
        self.storage = SQLiteStore(dbfile, test)
        self.keyword = keyword

    def setup(self, app):
        '''
        Make sure that other installed plugins don't affect the same keyword argument.
        '''
        for other in app.plugins:
            if not isinstance(other, SQLiteStorePlugin):
                continue
            if other.keyword == self.keyword:
                raise PluginError(_("Found another SQLiteStore plugin with conflicting settings (non-unique keyword)."))

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
    def __init__(self, filename, test=False):
        self.filename = filename
        self.db = sqlite3.connect(filename)
        self.db.row_factory = sqlite3.Row
        self._init_db()
        if not test:
            self._init_project('mapproxy-demo')
            self._demo_project('mapproxy-demo')
        else:
            self._init_project('base')

    def _init_db(self):
        self.db.execute("""
            PRAGMA foreign_keys = ON;
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS store (
                _id INTEGER PRIMARY KEY,
                id INTEGER NOT NULL,
                section TEXT NOT NULL,
                project TEXT,
                data TEXT NOT NULL,
                rank INTEGER,
                parent INTEGER,
                manual BOOLEAN,
                locked BOOLEAN,
                FOREIGN KEY(parent) REFERENCES store(_id) ON DELETE CASCADE
            )
        """)

    def _init_project(self, project):
        defaults_data = json.dumps(defaults.PROJECT_DEFAULTS)
        services_data = json.dumps(defaults.PROJECT_SERVICES)
        section_id = self.create_section_id(project)

        cur = self.db.cursor()
        inserts = []

        cur.execute("SELECT * FROM store WHERE section ='defaults' AND project=?", (project,))
        if not len(cur.fetchall()):
            inserts.append({'id': section_id, 'section': 'defaults', 'project': project, 'data': defaults_data})
        cur.executemany("INSERT INTO store (id, section, project, data) VALUES (:id, :section, :project, :data)", inserts)
        self.db.commit()

        inserts = []
        section_id = self.create_section_id(project)
        cur.execute("SELECT * FROM store WHERE section ='services' AND project=?", (project,))
        if not len(cur.fetchall()):
            inserts.append({'id': section_id, 'section': 'services', 'project': project, 'data': services_data})

        cur.executemany("INSERT INTO store (id, section, project, data) VALUES (:id, :section, :project, :data)", inserts)
        self.db.commit()

    def _demo_project(self, project):
        cur = self.db.cursor()
        cur.execute("SELECT * FROM store WHERE section ='wms_capabilities' AND project=?", (project,))
        if not len(cur.fetchall()):
            for id in DEMO_CONFIG:
                inserts = []
                section_id = self.create_section_id(project)
                data = json.dumps(DEMO_CONFIG[id]['data'])
                inserts.append({'id': section_id, 'section': DEMO_CONFIG[id]['section'], 'project': project, 'data': data})
                cur.executemany("INSERT INTO store (id, section, project, data) VALUES (:id, :section, :project, :data)", inserts)
                self.db.commit()

    def create_section_id(self, project):
        section_id = 1

        cur = self.db.cursor()
        cur.execute("SELECT MAX(id) FROM store WHERE project=?", (project,))
        row = cur.fetchone()[0]
        if row:
            section_id = row + 1
        return section_id

    def delete_project(self, project):
        cur = self.db.cursor()
        cur.execute("DELETE FROM store WHERE project=?", (project, ))
        self.db.commit()
        return cur.rowcount >= 1

    def get_projects(self):
        cur = self.db.cursor()
        cur.execute("SELECT DISTINCT project FROM store")
        for row in cur.fetchall():
            yield row['project']

    def get_all(self, section, project, default=DEFAULT_VALUE, with_rank=False, with_id=False, with_manual=False, with_locked=False, with_section=False):
        if default is DEFAULT_VALUE:
            default = {}

        result = default
        if hasattr(result, "append"):
            append_data = True
        else:
            append_data = False

        cur = self.db.cursor()
        cur.execute("SELECT id, data, parent, rank, manual, locked FROM store WHERE section = ? AND project = ?",
            (section, project))
        for row in cur.fetchall():
            data = {}
            data['data'] = json.loads(row['data'])
            if with_manual:
                data['_manual'] = row['manual']
            if with_id:
                data['_id'] = row['id']
            if with_rank:
                data['_parent'] = row['parent']
                data['_rank'] = row['rank']
            if with_locked:
                data['_locked'] = row['locked']
            if with_section:
                data['_section'] = section
            if append_data:
                result.append(data)
            else:
                result[row['id']] = data
        return result

    def get_all_data(self, section, project, default=DEFAULT_VALUE):
        data = self.get_all(section, project, default)
        for i, _data in data.items():
            data[i] = _data['data']
        return data

    def get(self, id, section, project, with_rank=False, with_manual=False, with_locked=False):
        cur = self.db.cursor()
        cur.execute("SELECT data, parent, rank, manual, locked FROM store WHERE id = ? AND section = ? AND project = ?",
            (id, section, project))
        row = cur.fetchone()
        if row:
            data = {}
            data['data'] = json.loads(row[0])
            if row[1] is not None:
                data['_parent'] = row[1]
            if with_rank and row[2] is not None:
                data['_rank'] = row[2]
            if with_manual and row[3] is not None:
                data['_manual'] = row[3]
            if with_locked and row[4] is not None:
                data['_locked'] = row[4]
            return data

    def add(self, section, project, data, with_id=False):
        if not with_id:
            section_id = self.create_section_id(project)
        else:
            section_id = data.pop('_id')

        rank = data.pop('_rank', None)
        parent = data.pop('_parent', None)
        manual = data.pop('_manual', False)
        locked = data.pop('_locked', False)

        data = json.dumps(data['data'])

        cur = self.db.cursor()
        cur.execute("INSERT INTO store (id, section, project, data, parent, rank, manual, locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (section_id, section, project, data, parent, rank, manual, locked))
        self.db.commit()
        return cur.lastrowid

    def update(self, id, section, project, data):
        rank = data.pop('_rank', None)
        parent = data.pop('_parent', None)
        manual = data.pop('_manual', False)
        locked = data.pop('_locked', False)
        data.pop('_id', None)
        data.pop('_layers', None)
        data = json.dumps(data.get('data', {}))

        cur = self.db.cursor()
        cur.execute("UPDATE store SET data = ?, parent = ?, rank = ?, manual = ?, locked = ? WHERE id = ? AND SECTION = ? AND project = ?",
            (data, parent, rank, manual, locked, id, section, project))
        self.db.commit()

    def updates(self, section, project, data):
        #ensure all needed values are present or None
        data = [{'id': d['_id'], 'rank': d['_rank'] if '_rank' in d else None, 'parent': d['_parent'] if '_parent' in d else None, 'manual': d['_manual'] if '_manual' in d else False, 'locked': d['_locked'] if '_locked' in d else False} for d in data if '_id' in d]
        cur = self.db.cursor()
        cur.executemany("UPDATE store SET parent = :parent, rank = :rank, manual = :manual, locked = :locked WHERE id = :id", data)
        self.db.commit()

    def delete(self, id, section, project):
        cur = self.db.cursor()
        cur.execute("DELETE FROM store WHERE id = ? AND SECTION = ? AND project = ?",
            (id, section, project))
        self.db.commit()
        return cur.rowcount == 1

    def copy_project(self, project, name):
        sections = ['wms_capabilities', 'defaults', 'services', 'layers', 'globals', 'caches', 'grids', 'sources']
        for section in sections:
            data = self.get_all(section, project, with_id=True, default=[])
            for result in data:
                self.add(section=section, project=name, data=result, with_id=True)
        return name

    def exists_in_data(self, section, project, search):
        cur = self.db.cursor()
        cur.execute("SELECT id FROM store WHERE section = ? AND project = ? AND data LIKE ?", (section, project, search))
        row = cur.fetchone()
        return row[0] if row else False

    def exist_project(self, project):
        cur = self.db.cursor()
        cur.execute("SELECT id FROM store WHERE section = 'defaults' AND project = ?", (project,))
        result = cur.fetchall()
        return len(result) > 0

    def check_dependencies(self, id, project, look_for):
        cur = self.db.cursor()
        cur.execute("SELECT section, data FROM store WHERE project = ? AND section in (%s)" % (', '.join(["'%s'" % section for section in look_for.keys()]), ), (project,))
        result = cur.fetchall()

        response = {}

        for row in result:
            section =  row[0]
            data = json.loads(row[1])
            if look_for[section] in data and id in data[look_for[section]]:
                dependency = {'name': data['name']}
                if data.has_key('title'):
                    dependency['title'] = data['title']
                if response.has_key(section):
                    response[section].append(dependency)
                else:
                    response[section] = [dependency]

        return response
