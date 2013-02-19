import os
from mapproxy_webconf.storage import SQLiteStore
from mapproxy_webconf.test.helper import TempDirTest

class TestSQLiteStorage(TempDirTest):
    def setup(self):
        TempDirTest.setup(self)
        self.storage = SQLiteStore(os.path.join(self.tmp_dir, 'test.sqlite'))

    def test_get_non_existent_section(self):
        assert self.storage.get_all('sources', 'base') == {}

    def test_get_non_existent_elem(self):
        assert self.storage.get(1, 'sources', 'base') == None

    def test_add_update_get(self):
        new_id = self.storage.add(section='sources', project='base', data={'foo': 'bar'})
        assert self.storage.get_all(section='sources', project='base') == {new_id: {'foo': 'bar'}}

        self.storage.update(id=new_id, section='sources', project='base', data={'foo': 'baz'})
        assert self.storage.get_all(section='sources', project='base') == {new_id: {'foo': 'baz'}}
