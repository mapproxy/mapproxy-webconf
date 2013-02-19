import os

from webtest import TestApp
from mapproxy_webconf.app import init_app, app
from mapproxy_webconf import bottle
from mapproxy_webconf import storage, config
from mapproxy_webconf.test import helper

bottle.debug(True)

class TestServerAPI(helper.TempDirTest):
    def setup(self):
        helper.TempDirTest.setup(self)
        self._app = init_app(self.tmp_dir)
        self.app = TestApp(self._app)

    def teardown(self):
        helper.TempDirTest.teardown(self)
        self._app.uninstall('sqlitestore')

    def test_wms_capabilities_list_empty(self):
        resp = self.app.get('/conf/base/wms_capabilities')
        assert resp.status == '200 OK'
        assert resp.content_type == 'application/json'
        assert resp.json == {}

    def test_add_wms_source(self):
        doc = {
            'title': 'WMS Source',
            'name': 'wms_source',
            'url': 'http://localhost/service?',
            'layers': [
            ]
        }
        resp = self.app.post_json('/conf/base/wms_capabilities', doc)
        assert resp.status == '201 Created'
        resp = self.app.get('/conf/base/wms_capabilities')
        assert resp.status == '200 OK'
        assert resp.content_type == 'application/json'
        assert resp.json == {'1': doc}


class TestServerAPIExistingConf(helper.TempDirTest):
    def setup(self):
        helper.TempDirTest.setup(self)
        self.storage_plugin = storage.YAMLStorePlugin(self.tmp_dir)
        mapproxy_conf = config.load_mapproxy_yaml(os.path.join(os.path.dirname(__file__), 'test.yaml'))
        config.fill_storage_with_mapproxy_conf(self.storage_plugin.storage, 'base', mapproxy_conf)
        self._app = app
        self._app.install(self.storage_plugin)
        self.app = TestApp(self._app)

    def teardown(self):
        helper.TempDirTest.teardown(self)
        self._app.uninstall('yamlstore')

    def test_grids(self):
        resp = self.app.get('/conf/base/grids')
        assert 'global_geodetic_sqrt2' in resp.json['grids']
