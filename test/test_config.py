from os import path as p
from mapproxy_webconf import config
from mapproxy_webconf.storage import SQLiteStore
from mapproxy_webconf.test import helper

def test_find_layer_sources():
    sources = config.find_layer_sources([
        {'name': 'foo', 'sources': ['a'],},
        {'name': 'bar', 'layers': [
            {'name': 'bar.1', 'sources': ['b'],},
            {'name': 'bar.2', 'sources': ['c'],},
        ]},
    ])

    assert sources == set(['a', 'b', 'c'])

def test_find_cache_sources():
    sources = config.find_cache_sources({
        'cache1': {'sources': ['a', 'b']},
        'cache2': {},
        'cache3': {'sources': ['c']},
    })

    assert sources == set(['a', 'b', 'c'])

def test_find_cache_grids():
    grids = config.find_cache_grids({
        'cache1': {'grids': ['a', 'b'], 'sources': ['a', 'b']},
        'cache2': {'grids': ['c']},
        'cache3': {'sources': ['c']},
    })

    assert grids == set(['a', 'b', 'c'])


def test_find_source_grids():
    grids = config.find_source_grids({
        'source1': {'grid': 'a', 'type': 'tile'},
        'source2': {'grid': 'c', 'type': 'tile'},
        'source3': {},
    })

    assert grids == set(['a', 'c'])


def test_used_caches_and_sources():
    layers = [
        {'sources': ['a', 'b']},
        {'sources': ['c', 'd']},
        {'layers': [
            {'sources': ['e', 'f']},
            {'sources': ['g']},
        ]},
    ]
    caches = {
        'a': {'sources': ['h', 'i']},
        'b': {},
        'c': {},
        'd': {},
        'e': {},
        'f': {'sources': ['b', 'j']},
        'z': {},
    }
    sources = {
        'c': {},
        'd': {},
        'g': {},
        'j': {},
        'x': {},
        'y': {},
    }
    used_caches, used_sources = config.used_caches_and_sources(layers, caches, sources)

    assert used_caches == set('abcdef')
    assert used_sources == set('gj')


class TestRoundTrip(helper.TempDirTest):
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
