import os

from webtest import TestApp
from nose.tools import assert_almost_equal
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

    def test_add_get_edit_delete(self):
        mock_serv = MockServ()
        mock_serv.expects('/foo/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')
        cap_file = os.path.join(os.path.dirname(__file__), 'fixtures', 'wms_nasa_cap.xml')
        mock_serv.returns(body_file=cap_file)
        with mock_serv:
            resp = self.app.post_json('/conf/base/wms_capabilities', {'data': {'url': mock_serv.base_url + '/foo/service'}})

        id = resp.json['_id']

        expected = {
            '_id': id,
            'data': {
                'abstract': helper.ANY,
                'title': 'JPL Global Imagery Service',
                'url': 'http://wms.jpl.nasa.gov/wms.cgi?',
                'layer': helper.ANY,
            }
        }
        assert resp.json == expected

        resp = self.app.get('/conf/base/wms_capabilities/%d' % resp.json['_id'])
        expected.pop('_id') # remove if we decide to pass _id in get request
        assert resp.json == expected

        resp = self.app.get('/conf/base/wms_capabilities')
        # add vars returned by function
        expected['_id'] = id
        expected['_locked'] = 0
        expected['_manual'] = 0

        assert resp.json == {str(id): expected}
        mock_serv.reset()

        with mock_serv:
            resp = self.app.put_json('/conf/base/wms_capabilities/%d' % id, {'data': {'url': mock_serv.base_url + '/foo/service'}})

        resp = self.app.delete('/conf/base/wms_capabilities/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/wms_capabilities/%d' % id, status=404)

class TestLayersAPI(ServerAPITest):
    def test_add_edit_delete_layers(self):
        resp = self.app.post_json('/conf/base/layers', {'data': {'name': '1'}})
        assert resp.status_code == 201
        assert resp.json == {'data': {'name': '1'}, '_id': helper.ANY, '_locked': False, '_manual': False}
        parent_id = resp.json['_id']
        first_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/layers', {'data': {'name': '2'}, '_parent': parent_id, '_rank': 10})
        assert resp.status_code == 201
        assert resp.json == {'data': {'name': '2'}, '_id': helper.ANY, '_locked': False, '_manual': False}
        secound_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/layers', {'data': {'name': '3'}, '_parent': parent_id, '_rank': 5})
        assert resp.status_code == 201
        assert resp.json == {'data': {'name': '3'}, '_id': helper.ANY, '_locked': False, '_manual': False}
        third_id = resp.json['_id']

        resp = self.app.get('/conf/base/layers')
        expected = {
            unicode(first_id): {'_parent': None, '_rank': None, '_id': first_id, 'data': {'name': '1'}, '_locked': 0, '_manual': 0},
            unicode(third_id): {'_parent': parent_id, '_rank': 5, '_id': third_id, 'data': {'name': '3'}, '_locked': 0, '_manual': 0},
            unicode(secound_id): {'_parent': parent_id, '_rank': 10, '_id': secound_id, 'data': {'name': '2'}, '_locked': 0, '_manual': 0}
        }
        assert resp.json == expected

        resp = self.app.get('/conf/base/layers/%d' % secound_id)
        assert resp.json == {'_parent': parent_id, 'data': {'name': '2'}}

        data = resp.json
        data['data']['name'] = u'foo'
        resp = self.app.put_json('/conf/base/layers/%d' % secound_id, data)
        assert resp.status_code == 200
        assert resp.json == {'_parent': parent_id, 'data': {'name': 'foo'}, '_locked': False, '_manual': False}

        self.app.delete('/conf/base/layers/%d' % third_id, status=204)
        self.app.delete('/conf/base/layers/%d' % third_id, status=404)
        self.app.delete('/conf/base/layers/%d' % secound_id, status=204)
        self.app.delete('/conf/base/layers/%d' % secound_id, status=404)
        self.app.delete('/conf/base/layers/%d' % first_id, status=204)
        self.app.delete('/conf/base/layers/%d' % first_id, status=404)

class TestSourcesAPI(ServerAPITest):
    def test_get_missing(self):
        self.app.get('/conf/base/sources/1', status=404)

    def test_delete_missing(self):
        self.app.delete('/conf/base/sources/1', status=404)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/sources', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/sources/%d' % id)
        assert resp.json == {'data': {'name': '1'}}
        resp = self.app.delete('/conf/base/sources/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/sources/%d' % id, status=404)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/sources', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/sources/%d' % id, {'data': {'name': 'foo'}})
        assert resp.json == {'data': {'name': 'foo'}, '_locked': False, '_manual': False}
        resp = self.app.get('/conf/base/sources/%d' % id)
        assert resp.json == {'data': {'name': 'foo'}}

    def test_dependencies(self):
        resp = self.app.post_json('/conf/base/sources', {'data': {'name': 'foo_source'}})
        assert resp.status_code == 201
        source_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/caches', {'data': {'name': 'foo_cache', 'sources': [source_id]}})
        assert resp.status_code == 201
        cache_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/layers', {'data': {'name': 'foo_layer', 'sources': [source_id]}})
        assert resp.status_code == 201
        layer_id = resp.json['_id']

        resp = self.app.delete('/conf/base/sources/%d' % source_id, status=405)
        assert resp.json == {'caches': [{'name': 'foo_cache'}], 'layers': [{'name': 'foo_layer'}]}

        resp = self.app.delete('/conf/base/layers/%d' % layer_id)
        assert resp.status_code == 204

        resp = self.app.delete('/conf/base/sources/%d' % source_id, status=405)
        assert resp.json == {'caches': [{'name': 'foo_cache'}]}

        resp = self.app.delete('/conf/base/caches/%d' % cache_id)
        assert resp.status_code == 204

        resp = self.app.delete('/conf/base/sources/%d' % source_id)
        assert resp.status_code == 204

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
        resp = self.app.post_json('/conf/base/caches', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        self.app.put('/conf/base/caches/%d' % id, 'foo', status=400)

    def test_update_bad_data(self):
        resp = self.app.post_json('/conf/base/caches', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        self.app.put('/conf/base/caches/%d' % id, '{foo: badjson}', headers=[('Content-type', 'application/json')], status=400)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/caches', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'data': {'name': '1'}}
        resp = self.app.delete('/conf/base/caches/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/caches/%d' % id, status=404)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/caches', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/caches/%d' % id, {'data': {'name': 'foo'}})
        assert resp.json == {'data': {'name': 'foo'}, '_locked': False, '_manual': False}
        resp = self.app.get('/conf/base/caches/%d' % id)
        assert resp.json == {'data': {'name': 'foo'}}

    def test_dependencies(self):
        resp = self.app.post_json('/conf/base/caches', {'data': {'name': 'bar_cache'}})
        assert resp.status_code == 201
        base_cache_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/caches', {'data': {'name': 'foo_cache', 'sources': [base_cache_id]}})
        assert resp.status_code == 201
        cache_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/layers', {'data': {'name': 'foo_layer', 'sources': [base_cache_id]}})
        assert resp.status_code == 201
        layer_id = resp.json['_id']

        resp = self.app.delete('/conf/base/caches/%d' % base_cache_id, status=405)
        assert resp.json == {'caches': [{'name': 'foo_cache'}], 'layers': [{'name': 'foo_layer'}]}

        resp = self.app.delete('/conf/base/layers/%d' % layer_id)
        assert resp.status_code == 204

        resp = self.app.delete('/conf/base/caches/%d' % base_cache_id, status=405)
        assert resp.json == {'caches': [{'name': 'foo_cache'}]}

        resp = self.app.delete('/conf/base/caches/%d' % cache_id)
        assert resp.status_code == 204

        resp = self.app.delete('/conf/base/caches/%d' % base_cache_id)
        assert resp.status_code == 204

class TestGridsAPI(ServerAPITest):
    def test_get_missing(self):
        self.app.get('/conf/base/grids/1', status=404)

    def test_delete_missing(self):
        self.app.delete('/conf/base/grids/1', status=404)

    def test_add_get_delete(self):
        resp = self.app.post_json('/conf/base/grids', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.get('/conf/base/grids/%d' % id)
        assert resp.json == {'data': {'name': '1'}}
        resp = self.app.delete('/conf/base/grids/%d' % id)
        assert resp.status_code == 204
        resp = self.app.get('/conf/base/grids/%d' % id, status=404)

    def test_add_update_get(self):
        resp = self.app.post_json('/conf/base/grids', {'data': {'name': '1'}})
        assert resp.status_code == 201
        id = resp.json['_id']
        resp = self.app.put_json('/conf/base/grids/%d' % id, {'data': {'name': 'foo'}})
        assert resp.json == {'data': {'name': 'foo'}, '_locked': False, '_manual': False}
        resp = self.app.get('/conf/base/grids/%d' % id)
        assert resp.json == {'data': {'name': 'foo'}}

    def test_dependencies(self):
        resp = self.app.post_json('/conf/base/grids', {'data': {'name': 'foo_grid'}})
        assert resp.status_code == 201
        grid_id = resp.json['_id']

        resp = self.app.post_json('/conf/base/caches', {'data': {'name': 'foo_cache', 'grids': [grid_id]}})
        assert resp.status_code == 201
        cache_id = resp.json['_id']

        resp = self.app.delete('/conf/base/grids/%d' % grid_id, status=405)
        assert resp.json == {'caches': [{'name': 'foo_cache'}]}

        resp = self.app.delete('/conf/base/caches/%d' % cache_id)
        assert resp.status_code == 204

        resp = self.app.delete('/conf/base/grids/%d' % grid_id)
        assert resp.status_code == 204


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

        data_dict = dict(enumerate([dict(resp.json[k]['data']) for k in resp.json]))
        data = id_dict_to_named_dict(data_dict)

        assert 'global_geodetic_sqrt2' in data

class TestProjectAPI(ServerAPITest):
    def test_create_project(self):
        resp = self.app.post_json('/project/create', {'name': 'test'})
        assert resp.json == {'url': '/project/test/conf'}

    def test_create_project_duplicated(self):
        resp = self.app.post_json('/project/create', {'name': 'test'}, status=400)
        assert resp.json.has_key('error')


class TestGeoOpperations(ServerAPITest):
    def test_scales_to_res_to_scales(self):
        scales = [10000000, 1000000, 100000, 10000, 1000, 100, 10, 1]

        resp = self.app.post_json('/res', {'data': scales})
        assert resp.status_code == 200
        assert resp.json.has_key('result')

        resp = self.app.post_json('/scales', {'data': resp.json['result'], 'mode': 'to_scales'})
        assert resp.status_code == 200
        assert resp.json.has_key('result')

        for idx, result in enumerate(resp.json['result']):
            assert_almost_equal(result, scales[idx])

    def test_res_to_scales_to_res(self):
        res = [1.40625, 0.703125, 0.3515625, 0.17578125]

        resp = self.app.post_json('/scales', {'data': res, 'mode': 'to_scales', 'dpi': 72})
        assert resp.status_code == 200
        assert resp.json.has_key('result')

        resp = self.app.post_json('/res', {'data': resp.json['result'], 'dpi': 72})
        assert resp.status_code == 200
        assert resp.json.has_key('result')

        for idx, result in enumerate(resp.json['result']):
            assert_almost_equal(result, res[idx], places=5+idx)

    def test_transform_bbox(self):
        bbox = [8,52,9,53]

        resp = self.app.post_json('/transform_bbox', {'source': 'EPSG:4326', 'dest': 'EPSG:3857', 'bbox': bbox})
        assert resp.status_code == 200
        assert resp.json.has_key('bbox')

        resp = self.app.post_json('/transform_bbox', {'source': 'EPSG:3857', 'dest': 'EPSG:4326', 'bbox': resp.json['bbox']})
        assert resp.status_code == 200
        assert resp.json.has_key('bbox')

        for idx, result in enumerate(resp.json['bbox']):
            assert_almost_equal(result, bbox[idx])

    def test_calculate_tiles(self):
        resp = self.app.post_json('/calculate_tiles', status=400)
        assert resp.json.has_key('error')

        resp = self.app.post_json('/calculate_tiles', {'srs': 'EPSG:4326'})
        assert resp.json.has_key('result')
        result = resp.json['result']
        assert len(result) == 20
        assert result[0]['level'] == 0
        assert result[19]['level'] == 19

        resp = self.app.post_json('/calculate_tiles', {'srs': 'EPSG:4326', 'bbox': [8, 52, 9, 53], 'bbox_srs': 'EPSG:4326'})
        assert resp.json.has_key('result')
        result = resp.json['result']
        assert len(result) == 20
        assert result[0]['level'] == 0
        assert result[19]['level'] == 19

        resp = self.app.post_json('/calculate_tiles', {'srs': 'EPSG:4326', 'bbox': [890555.9263461898, 6800125.454397307, 1001875.4171394621, 6982997.920389788], 'bbox_srs': 'EPSG:3857'})
        assert resp.json.has_key('result')
        result = resp.json['result']
        assert len(result) == 20
        assert result[0]['level'] == 0
        assert result[19]['level'] == 19

        resp = self.app.post_json('/calculate_tiles', {'srs': 'EPSG:4326', 'res': [1.40625, 0.703125, 0.3515625, 0.17578125]})
        assert resp.json.has_key('result')
        result = resp.json['result']
        assert len(result) == 4
        assert result[0]['level'] == 0
        assert result[3]['level'] == 3

        resp = self.app.post_json('/calculate_tiles', {'srs': 'EPSG:4326', 'res': [1000, 100, 10, 1]})
        assert resp.json.has_key('result')
        result = resp.json['result']
        assert len(result) == 4
        assert result[0]['level'] == 0
        assert result[3]['level'] == 3
