from os import path as p
from mapproxy_webconf import config
from mapproxy_webconf.storage import SQLiteStore
from mapproxy_webconf.test import helper
from mapproxy_webconf.test.helper import ANY

import pytest

def test_find_layer_sources():
    sources = config.find_layer_sources([
        {'name': 'foo', 'sources': [1],},
        {'name': 'bar', 'layers': [
            {'name': 'bar.1', 'sources': [2],},
            {'name': 'bar.2', 'sources': [3],},
        ]},
    ])

    assert sources == set([1, 2, 3])

def test_find_cache_sources():
    sources = config.find_cache_sources({
        'cache1': {'sources': [1, 2]},
        'cache2': {},
        'cache3': {'sources': [3]},
    })

    assert sources == set([1, 2, 3])

def test_find_cache_grids():
    grids = config.find_cache_grids({
        'cache1': {'grids': [1, 2], 'sources': [1, 2]},
        'cache2': {'grids': [3]},
        'cache3': {'sources': [3]},
    })

    assert grids == set([1, 2, 3])


def test_find_source_grids():
    grids = config.find_source_grids({
        'source1': {'grid': 1, 'type': 'tile'},
        'source2': {'grid': 3, 'type': 'tile'},
        'source3': {},
    })

    assert grids == set([1, 3])


def test_used_caches_and_sources():
    layers = [
        {'sources': [1, 2]},
        {'sources': [3, 4]},
        {'layers': [
            {'sources': [5, 6]},
            {'sources': [7]},
        ]},
    ]
    caches = {
        1: {'sources': [8, 9]},
        2: {},
        3: {},
        4: {},
        5: {},
        6: {'sources': [2, 10]},
        12: {},
    }
    sources = {
        3: {},
        4: {},
        7: {},
        10: {},
        11: {},
        12: {},
    }
    used_caches, used_sources = config.used_caches_and_sources(layers, caches, sources)

    assert used_caches == set([1, 2, 3, 4, 5, 6])
    assert used_sources == set([7, 10])


def test_layer_tree():
    layers = {
        1: {'name': '1', '_rank': 0, '_parent': None},
        2: {'name': '2', '_rank': 1, '_parent': None},
        3: {'name': '1.1', '_rank': 0, '_parent': 1},
        4: {'name': '1.2', '_rank': 1, '_parent': 1},
        5: {'name': '1.3', '_rank': 2, '_parent': 1},
        6: {'name': '1.2.1', '_rank': 0, '_parent': 4},
    }

    tree = config.layer_tree(layers)

    assert tree == [{'name': '1', 'layers': ANY}, {'name': '2'}]
    assert tree[0]['layers'] == [
        {'name': '1.1'},
        {'name': '1.2', 'layers': [{'name': '1.2.1'}]},
        {'name': '1.3'},
    ]

class TestMapProxyWrite(helper.TempDirTest):
    def test_write_mapproxy_conf(self):
        storage = SQLiteStore(p.join(self.tmp_dir, 'storage1.sqlite'))
        grid_id = storage.add('grids', 'base', {'data': {'name': 'webmercator', 'srs': 'EPSG:3857'}})
        source_id = storage.add('sources', 'base', {'data': {'name': 'source', 'type': 'wms'}})
        cache_id = storage.add('caches', 'base', {'data': {'name': 'cache', 'grids': [grid_id], 'sources': [source_id]}})
        storage.add('layers', 'base', {'data': {'name': 'layer', 'sources': [cache_id]}})

        tmp_mapproxy_conf = config.mapproxy_conf_from_storage(storage, 'base')

        expected = {
            'services': {'wms': {'srs': ['EPSG:4326'], 'md': {'title': 'Default WMS'}}, 'demo': {}},
            'layers': [{'name': 'layer', 'sources': ['cache']}],
            'grids': {'webmercator': {'srs': 'EPSG:3857'}},
            'sources': {'source': {'type': 'wms'}},
            'caches': {'cache': {'grids': ['webmercator'], 'sources': ['source']}}
        }
        assert tmp_mapproxy_conf == expected

class TestRoundTrip(helper.TempDirTest):

    @pytest.mark.xfail(reason='fill_storage_with_mapproxy_conf does not convert names to ids')
    def test_roundtrip(self):
        # read yaml into storage
        storage = SQLiteStore(p.join(self.tmp_dir, 'storage1.sqlite'))
        mapproxy_conf = config.load_mapproxy_yaml(p.join(p.dirname(__file__), 'test.yaml'))
        config.fill_storage_with_mapproxy_conf(storage, 'base', mapproxy_conf)

        # write out config from storage1
        tmp_mapproxy_conf = config.mapproxy_conf_from_storage(storage, 'base')
        tmp_out_file = p.join(self.tmp_dir, 'out.yaml')
        config.write_mapproxy_yaml(tmp_mapproxy_conf, tmp_out_file)

        # read in config, writeout again
        storage = SQLiteStore(p.join(self.tmp_dir, 'storage2.sqlite'))
        mapproxy_conf = config.load_mapproxy_yaml(tmp_out_file)
        config.fill_storage_with_mapproxy_conf(storage, 'base', mapproxy_conf)
        new_mapproxy_conf = config.mapproxy_conf_from_storage(storage, 'base')

        # compare output of storage1 with storage2
        assert tmp_mapproxy_conf == new_mapproxy_conf
