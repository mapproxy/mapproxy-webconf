import yaml
from mapproxy_webconf import utils

def load_mapproxy_yaml(filename):
    with open(filename, 'rb') as f:
        mapproxy_conf = yaml.load(f)

    return mapproxy_conf

def write_mapproxy_yaml(mapproxy_conf, filename):
    content = yaml.dump(mapproxy_conf, default_flow_style=False)
    utils.save_atomic(filename, content=content)

def fill_storage_with_mapproxy_conf(storage, project, mapproxy_conf):
    for section_name in ['services', 'layers', 'sources', 'grids', 'globals', 'caches']:
        section = mapproxy_conf.get(section_name, {})
        storage.put(section_name, project, section)


def mapproxy_conf_from_storage(storage, project):
    mapproxy_conf = {}

    mapproxy_conf['services'] = storage.get('services', project)

    used_sources = set()
    used_caches = set()

    sources = storage.get('sources', project)
    caches = storage.get('caches', project)
    layers = storage.get('layers', project, [])
    grids = storage.get('grids', project)

    used_caches, used_sources = used_caches_and_sources(layers, caches, sources)

    used_grids = find_cache_grids(caches).union(find_source_grids(sources))

    mapproxy_conf['layers'] = layers
    mapproxy_conf['caches'] = dict((k, caches[k]) for k in used_caches)
    mapproxy_conf['sources'] = dict((k, sources[k]) for k in used_sources)
    mapproxy_conf['grids'] = dict((k, grids[k]) for k in used_grids)

    return mapproxy_conf


def used_caches_and_sources(layers, caches, sources):
    """
    Find used cache and source names in layers and caches configuration.
    """
    used_layer_sources = find_layer_sources(layers)
    used_cache_sources = find_cache_sources(caches)
    all_used_sources = used_layer_sources.union(used_cache_sources)

    avail_caches = set(caches.iterkeys())
    avail_sources = set(sources.iterkeys())

    used_caches = avail_caches.intersection(all_used_sources)
    used_sources = avail_sources.intersection(all_used_sources).difference(used_caches)

    return used_caches, used_sources

def find_cache_grids(cache_conf):
    grids = set()
    for cache in cache_conf.itervalues():
        grids.update(cache.get('grids', []))
    return grids

def find_source_grids(source_conf):
    grids = set()
    for source in source_conf.itervalues():
        grid = source.get('grid')
        if grid:
            grids.add(grid)
    return grids

def find_layer_sources(layers_conf):
    sources = set()
    _find_layer_sources(layers_conf, sources)
    return sources

def _find_layer_sources(layers, sources):
    for layer in layers:
        sources.update(layer.get('sources', []))
        if 'layers' in layer:
            _find_layer_sources(layer['layers'], sources)

def find_cache_sources(caches_conf):
    sources = set()
    for cache in caches_conf.itervalues():
        sources.update(cache.get('sources', []))
    return sources