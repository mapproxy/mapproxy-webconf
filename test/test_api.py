import os

from webtest import TestApp
from mapproxy_webconf.app import init_app, app
from mapproxy_webconf import bottle
from mapproxy_webconf import storage, config
from mapproxy_webconf.test import helper
from mapproxy_webconf.config import id_dict_to_named_dict

bottle.debug(True)

class ServerAPITest(helper.TempDirTest):
    def setup(self):
        helper.TempDirTest.setup(self)
        self._app = init_app(self.tmp_dir)
        self.app = TestApp(self._app)

    def teardown(self):
        helper.TempDirTest.teardown(self)
        self._app.uninstall('sqlitestore')


class TestWMSCapabilitiesAPI(ServerAPITest):
    def test_wms_capabilities_list_empty(self):
        resp = self.app.get('/conf/base/wms_capabilities')
        assert resp.status_code == 200
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

class TestLayersAPI(ServerAPITest):
    def test_layers(self):
        resp = self.app.post_json('/conf/base/layers', {'name': '1'})
        assert resp.status_code == 201
        assert resp.json == {'name': '1', '_id': helper.ANY}
        parent_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/layers', {'name': '2', '_parent': parent_id, '_rank': 10})
        assert resp.status_code == 201
        assert resp.json == {'name': '2', '_id': helper.ANY}

        resp = self.app.post_json('/conf/base/layers', {'name': '3', '_parent': parent_id, '_rank': 5})
        assert resp.status_code == 201
        assert resp.json == {'name': '3', '_id': helper.ANY}

        resp = self.app.get('/conf/base/layers')
        assert resp.json == {'tree': [{'name': '1', 'layers': [{'name': '3'}, {'name': '2'}]}]}


class TestSourcesAPI(ServerAPITest):
    def test_get_missing(self):
        self.app.get('/conf/base/sources/1', status=404)

    def test_delete_missing(self):
        self.app.delete('/conf/base/sources/1', status=404)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/sources', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/sources/%d' % id)
        assert resp.json == {'name': '1'}
        self.app.delete('/conf/base/sources/%d' % id)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/sources', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/sources/%d' % id, {'name': 'foo'})
        assert resp.json == {'name': 'foo'}
        resp = self.app.get('/conf/base/sources/%d' % id)
        assert resp.json == {'name': 'foo'}


class TestCachesAPI(ServerAPITest):
    def test_get_missing(self):
        self.app.get('/conf/base/caches/1', status=404)

    def test_delete_missing(self):
        self.app.delete('/conf/base/caches/1', status=404)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'name': '1'}
        self.app.delete('/conf/base/caches/%d' % id)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/caches/%d' % id, {'name': 'foo'})
        assert resp.json == {'name': 'foo'}
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'name': 'foo'}


class TestServerAPIExistingConf(helper.TempDirTest):
    def setup(self):
        helper.TempDirTest.setup(self)
        self.storage_plugin = storage.SQLiteStorePlugin(os.path.join(self.tmp_dir, 'mapproxy.yaml'))
        mapproxy_conf = config.load_mapproxy_yaml(os.path.join(os.path.dirname(__file__), 'test.yaml'))
        config.fill_storage_with_mapproxy_conf(self.storage_plugin.storage, 'base', mapproxy_conf)
        self._app = app
        self._app.install(self.storage_plugin)
        self.app = TestApp(self._app)

    def teardown(self):
        helper.TempDirTest.teardown(self)
        self._app.uninstall('sqlitestore')

    def test_grids(self):
        resp = self.app.get('/conf/base/grids')
        data = id_dict_to_named_dict(resp.json)
        assert 'global_geodetic_sqrt2' in data
