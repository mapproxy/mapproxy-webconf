from nose.tools import assert_almost_equal, assert_raises

from mapproxy.grid import tile_grid
from mapproxy.srs import SRS

from mapproxy_webconf import defaults
from mapproxy_webconf.lib.geojson import ConfigGeoJSONGrid, polygons, point_feature, polygon_feature, features
from mapproxy_webconf.lib.grid import InvalidTransformationException

GLOBAL_BBOX_4326 = [-180.0, -90.0, 180.0, 90.0]
GLOBAL_BBOX_4326_ALIGNED = [-180, -85.05112877, 180, 85.05112877]
LOCAL_BBOX_4326_1 = [-20.0, -20.0, 20.0, 20.0]
LOCAL_BBOX_4326_2 = [-40.0, -40.0, 40.0, 40.0]

GLOBAL_BBOX_3857 = [-20037508.342789236,-20037508.342789236,20037508.342789236,20037508.342789236]
GLOBAL_BBOX_TRANSFORMED_TO_3857 = [-20037508.342789244, -147730762.66992167, 20037508.342789244, 147730758.19456753]
LOCAL_BBOX_3857_1 = [-2226389.8158654715, -2273030.92698769, 2226389.8158654715, 2273030.926987689]
LOCAL_BBOX_3857_2 = [-4452779.631730943, -4865942.279503176, 4452779.631730943, 4865942.279503176]

OVERGLOBAL_BBOX_4326 = [-703.125, -421.825, 703.125, 421.825]

GLOBAL_POLYGON_4326 = [(-180.0, -90.0), (180.0, -90.0), (180.0, 90.0), (-180.0, 90.0), (-180.0, -90.0)]
GLOBAL_POLYGON_3857 = [(-20037508.342789236,-20037508.342789236), (20037508.342789236, -20037508.342789236), (20037508.342789236, 20037508.342789236), (-20037508.342789236, 20037508.342789236), (-20037508.342789236, -20037508.342789236)]
LOCAL_POLYGON_3857 = [(-2226389.8158654715, -2273030.92698769), (2226389.8158654715, -2273030.92698769), (2226389.8158654715, 2273030.926987689), (-2226389.8158654715, 2273030.926987689), (-2226389.8158654715, -2273030.92698769)]

def assert_list_almost_equal(list_a, list_b):
    assert len(list_a) == len(list_b)
    for i in range(len(list_a)):
        assert_almost_equal(list_a[i], list_b[i])

def assert_point_list_almost_equal(list_a, list_b):
    assert len(list_a) == len(list_b)
    for i in range(len(list_a)):
        assert_almost_equal(list_a[i][0], list_b[i][0])
        assert_almost_equal(list_a[i][1], list_b[i][1])

class TestConfigGeoJSONGrid(object):
    def test_without_parameters(self):
        config = ConfigGeoJSONGrid()
        assert config.request_bbox == None
        assert config.grid_bbox == None
        assert config.level == None
        assert config.grid_srs == None
        assert config.grid_bbox_srs == None
        assert config.map_srs == None
        assert config.map_bbox == None
        assert config.res == None
        assert config.origin == 'll'

    def test_all_bboxes_in_grid_srs(self):
        #global
        config = ConfigGeoJSONGrid(grid_srs='EPSG:4326', map_srs='EPSG:3857', grid_bbox_srs='EPSG:3857', request_bbox=GLOBAL_BBOX_3857, grid_bbox=GLOBAL_BBOX_3857)
        assert_list_almost_equal(config.map_bbox, GLOBAL_BBOX_4326_ALIGNED)
        assert_list_almost_equal(config.grid_bbox, GLOBAL_BBOX_4326_ALIGNED)

        config = ConfigGeoJSONGrid(grid_srs='EPSG:4326', map_srs='EPSG:3857', grid_bbox_srs='EPSG:4326', request_bbox=GLOBAL_BBOX_3857, grid_bbox=GLOBAL_BBOX_4326)
        assert_list_almost_equal(config.map_bbox, GLOBAL_BBOX_4326_ALIGNED)
        assert_list_almost_equal(config.grid_bbox, GLOBAL_BBOX_4326)

        config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=GLOBAL_BBOX_4326, grid_bbox=[-180, -90, 180, 270])
        assert config.map_bbox == None
        with assert_raises(InvalidTransformationException) as cm:
            config.grid_bbox
        assert cm.exception.message == 'Invalid transformation for grid_bbox'

        config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:3857', request_bbox=GLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_3857)
        assert config.map_bbox == None
        assert_list_almost_equal(config.grid_bbox, GLOBAL_BBOX_3857)

        #local
        config = ConfigGeoJSONGrid(grid_srs='EPSG:4326', map_srs='EPSG:3857', grid_bbox_srs='EPSG:3857', request_bbox=LOCAL_BBOX_3857_1, grid_bbox=LOCAL_BBOX_3857_2)
        assert_list_almost_equal(config.map_bbox, LOCAL_BBOX_4326_1)
        assert_list_almost_equal(config.grid_bbox, LOCAL_BBOX_4326_2)

        config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=LOCAL_BBOX_4326_1, grid_bbox=LOCAL_BBOX_4326_2)
        assert_list_almost_equal(config.map_bbox, LOCAL_BBOX_3857_1)
        assert_list_almost_equal(config.grid_bbox, LOCAL_BBOX_3857_2)

        #overglobal
        config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=OVERGLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_4326)
        assert config.map_bbox == None
        with assert_raises(InvalidTransformationException) as cm:
            config.grid_bbox
        assert cm.exception.message == 'Invalid transformation for grid_bbox'

def test_view_box():
    grid_srs = 'EPSG:4326'
    grid_bbox_srs = 'EPSG:4326'
    map_srs = 'EPSG:4326'
    level = 0

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_4326_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, LOCAL_BBOX_4326_1)

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_4326_2, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-30.0, -30.0, 30.0, 30.0])

    config = ConfigGeoJSONGrid(grid_bbox=[-10, -30, 10, 30], request_bbox=LOCAL_BBOX_4326_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-10.0, -20.0, 10.0, 20.0])

    map_srs = 'EPSG:3857'

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_3857_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, LOCAL_BBOX_4326_1)

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_3857_2, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-30.0, -30.0, 30.0, 30.0])

    config = ConfigGeoJSONGrid(grid_bbox=[-10, -30, 10, 30], request_bbox=LOCAL_BBOX_3857_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-10.0, -20.0, 10.0, 20.0])

    grid_srs = 'EPSG:3857'
    map_srs = 'EPSG:4326'

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_4326_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, LOCAL_BBOX_3857_1)

    config = ConfigGeoJSONGrid(grid_bbox=[-30, -30, 30, 30], request_bbox=LOCAL_BBOX_4326_2, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-3339584.723798206, -3503549.8435043744, 3339584.723798206, 3503549.843504374])

    config = ConfigGeoJSONGrid(grid_bbox=[-10, -30, 10, 30], request_bbox=LOCAL_BBOX_4326_1, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs, level=level)
    assert_list_almost_equal(config.view_bbox, [-1113194.9079327343, -2273030.92698769, 1113194.9079327343, 2273030.926987689])

    config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=OVERGLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_4326)
    with assert_raises(InvalidTransformationException) as cm:
        config.view_bbox
    assert cm.exception.message == 'Invalid transformation for grid_bbox'

def test_global_polygon():
    defaults.TILE_POLYGON_POINTS = 4
    map_srs = 'EPSG:4326'
    grid_srs = 'EPSG:4326'
    grid_bbox_srs = 'EPSG:4326'
    grid_bbox = GLOBAL_BBOX_4326
    request_bbox = GLOBAL_BBOX_4326
    config = ConfigGeoJSONGrid(map_srs=map_srs, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, grid_bbox=grid_bbox, request_bbox=request_bbox)

    result = list(polygons(config, [(0, 0, 0)], False))[0]
    assert_point_list_almost_equal(result[0][0], GLOBAL_POLYGON_4326)

    result = list(polygons(config, [(0, 0,0)], True))[0]
    assert_point_list_almost_equal(result[0][0], GLOBAL_POLYGON_4326)
    assert_list_almost_equal(result[1], [0.0, 0.0])
    assert result[2] == (0, 0, 0)

    config = ConfigGeoJSONGrid(grid_srs='EPSG:4326', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=OVERGLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_4326)

    result = list(polygons(config, [(0, 0, 0)], False))[0]
    assert_point_list_almost_equal(result[0][0], GLOBAL_POLYGON_4326)

    config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', grid_bbox_srs='EPSG:4326', request_bbox=OVERGLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_4326)
    with assert_raises(InvalidTransformationException) as cm:
        config.grid_bbox
    assert cm.exception.message == 'Invalid transformation for grid_bbox'

def test_local_polygon():
    defaults.TILE_POLYGON_POINTS = 4
    map_srs = 'EPSG:3857'
    grid_srs = 'EPSG:4326'
    grid_bbox_srs = 'EPSG:4326'
    grid_bbox = LOCAL_BBOX_4326_1
    request_bbox = LOCAL_BBOX_3857_1
    config = ConfigGeoJSONGrid(map_srs=map_srs, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, grid_bbox=grid_bbox, request_bbox=request_bbox)

    result = list(polygons(config, [(0, 0, 0)], False))[0]
    assert_point_list_almost_equal(result[0][0], LOCAL_POLYGON_3857)

    result = list(polygons(config, [(0, 0,0)], True))[0]
    assert_point_list_almost_equal(result[0][0], LOCAL_POLYGON_3857)
    assert_list_almost_equal(result[1], [0.0, 0.0])
    assert result[2] == (0, 0, 0)

class TestFeatureCreation(object):
    def test_point_feature(self):
        assert point_feature([4, 4]) == {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [4, 4]
            },
            "properties": {}
        }

        assert point_feature([4, 4], {"foo": "bar"}) == {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [4, 4]
            },
            "properties": {"foo": "bar"}
        }

    def test_polygon_feature(self):
        assert polygon_feature([[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]) == {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]
            },
            "properties": {}
        }

        assert polygon_feature([[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]], {"foo": "bar"}) == {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]
            },
            "properties": {"foo": "bar"}
        }

    def test_feature_list(self):
        request_bbox = GLOBAL_BBOX_4326
        grid_bbox = GLOBAL_BBOX_4326
        level = 0
        grid_srs = 'EPSG:4326'
        grid_bbox_srs = 'EPSG:4326'
        map_srs = 'EPSG:4326'
        config = ConfigGeoJSONGrid(request_bbox=request_bbox, grid_bbox=grid_bbox, level=level, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs)

        result = features(config)
        assert len(result) == 2

        level = 1
        config = ConfigGeoJSONGrid(request_bbox=request_bbox, grid_bbox=grid_bbox, level=level, grid_srs=grid_srs, grid_bbox_srs=grid_bbox_srs, map_srs=map_srs)

        result = features(config)
        assert len(result) == 4

        level = 0
        config = ConfigGeoJSONGrid(grid_srs='EPSG:3857', map_srs='EPSG:4326', level=level, grid_bbox_srs='EPSG:4326', request_bbox=OVERGLOBAL_BBOX_4326, grid_bbox=GLOBAL_BBOX_4326)
        with assert_raises(InvalidTransformationException) as cm:
            features(config)
        assert cm.exception.message == 'Invalid transformation for grid_bbox'
