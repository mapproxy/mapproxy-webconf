import os

from webtest import TestApp
from mapproxy_webconf.app import init_app, app
from mapproxy_webconf import bottle
from mapproxy_webconf import storage, config
from mapproxy_webconf.test import helper
from mapproxy_webconf.config import id_dict_to_named_dict

from mapproxy.test.http import MockServ

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
        resp = self.app.delete('/conf/base/sources/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/sources/%d' % id, status=404)

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

    def test_add_bad_data(self):
        self.app.post('/conf/base/caches', '{foo: badjson}', headers=[('Content-type', 'application/json')], status=400)

    def test_add_non_json(self):
        self.app.post('/conf/base/caches', 'foo', status=400)

    def test_update_non_json(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        self.app.put('/conf/base/caches/%d' % id, 'foo', status=400)

    def test_update_bad_data(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        self.app.put('/conf/base/caches/%d' % id, '{foo: badjson}', headers=[('Content-type', 'application/json')], status=400)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'name': '1'}
        resp = self.app.delete('/conf/base/caches/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/caches/%d' % id, status=404)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/caches', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/caches/%d' % id, {'name': 'foo'})
        assert resp.json == {'name': 'foo'}
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'name': 'foo'}


class TestGridsAPI(ServerAPITest):
    def test_get_missing(self):
        self.app.get('/conf/base/grids/1', status=404)

    def test_delete_missing(self):
        self.app.delete('/conf/base/grids/1', status=404)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/grids', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/grids/%d' % id)
        assert resp.json == {'name': '1'}
        resp = self.app.delete('/conf/base/grids/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/grids/%d' % id, status=404)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/grids', {'name': '1'})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/grids/%d' % id, {'name': 'foo'})
        assert resp.json == {'name': 'foo'}
        resp = self.app.get('/conf/base/grids/%d' % id)
        assert resp.json == {'name': 'foo'}


class TestWMSCapabilitiesAPI(ServerAPITest):
    def test_post_url(self):
        mock_serv = MockServ()
        mock_serv.expects('/foo/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')
        cap_file = os.path.join(os.path.dirname(__file__), 'fixtures', 'wms_nasa_cap.xml')
        mock_serv.returns(body_file=cap_file)

        with mock_serv:
            resp = self.app.post_json('/conf/base/wms_capabilities', {'url': mock_serv.base_url + '/foo/service'})

        id = resp.json['_id']

        expected = {
            '_id': id,
            'abstract': helper.ANY,
            'title': 'JPL Global Imagery Service',
            'url': 'http://wms.jpl.nasa.gov/wms.cgi?',
            'layer': helper.ANY,
        }
        assert resp.json == expected

        resp = self.app.get('/conf/base/wms_capabilities/%d' % resp.json['_id'])
        expected.pop('_id') # remove if we decide to pass _id in get request
        assert resp.json == expected

        resp = self.app.get('/conf/base/wms_capabilities')
        assert resp.json == {str(id): expected}

        mock_serv.reset()
        with mock_serv:
            resp = self.app.put_json('/conf/base/wms_capabilities/1', {'url': mock_serv.base_url + '/foo/service'})

        resp = self.app.delete('/conf/base/wms_capabilities/1')
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/wms_capabilities/%d' % id, status=404)



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
