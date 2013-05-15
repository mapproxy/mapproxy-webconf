import yaml
import ConfigParser as _ConfigParser
from mapproxy.config.spec import validate_mapproxy_conf
from mapproxy_webconf import utils

def load_mapproxy_yaml(filename):
    with open(filename, 'rb') as f:
        mapproxy_conf = yaml.load(f)

    return mapproxy_conf

def write_mapproxy_yaml(mapproxy_conf, filename):
    content = yaml.safe_dump(mapproxy_conf, default_flow_style=False)
    utils.save_atomic(filename, content=content)
    return content

def fill_storage_with_mapproxy_conf(storage, project, mapproxy_conf):
    # TODO convert named references (grids/caches/sources) to ids
    for section_name in ['services', 'layers', 'sources', 'grids', 'globals', 'caches']:
        section = mapproxy_conf.get(section_name, {})
        if isinstance(section, list):
            for item in section:
                storage.add(section_name, project, item)
        else:
            for name, item in section.iteritems():
                if item is None:
                    continue
                item['name'] = name
                storage.add(section_name, project, item)

def id_dict_to_named_dict(input):
    output = {}
    for _, item in input.iteritems():
        name = item.pop('name')
        output[name] = item
    return output

def create_id_name_map(*dicts):
    id_map = {}
    for d in dicts:
        for key, value in d.iteritems():
            id_map[key] = value.get('name')

    return id_map

def validate(mapproxy_conf):
    return validate_mapproxy_conf(utils.convert(mapproxy_conf))

def mapproxy_conf_from_storage(storage, project):
    mapproxy_conf = {}

    services = storage.get_all('services', project).values()
    if services:
        mapproxy_conf['services'] = {}
        for service, config in services[0].items():
            if 'active' in config and config['active']:
                config.pop('active', None)
                mapproxy_conf['services'][service] = config

    _globals = storage.get_all('globals', project).values()
    if _globals:
        mapproxy_conf['globals'] = _globals[0]

    used_sources = set()
    used_caches = set()

    sources = storage.get_all('sources', project)
    caches = storage.get_all('caches', project)
    layers = storage.get_all('layers', project, [])
    grids = storage.get_all('grids', project)

    used_caches, used_sources = used_caches_and_sources(layers, caches, sources)

    used_grids = find_cache_grids(caches).union(find_source_grids(sources))

    id_map = create_id_name_map(sources, caches, grids)

    if layers:
        mapproxy_conf['layers'] = [replace_ids_layer(l, id_map) for l in layers]
    if used_caches:
        mapproxy_conf['caches'] = id_dict_to_named_dict(dict((k, replace_ids_cache(caches[k], id_map)) for k in used_caches))
    if used_sources:
        mapproxy_conf['sources'] = id_dict_to_named_dict(dict((k, sources[k]) for k in used_sources))
    if used_grids:
        mapproxy_conf['grids'] = id_dict_to_named_dict(dict((k, grids[k]) for k in used_grids if type(k) == int))

    if 'sources' in mapproxy_conf:
        for source in mapproxy_conf['sources'].values():
            if 'req' in source and 'layers' in source['req']:
                source['req']['layers'] = ','.join(source['req']['layers'])

    return mapproxy_conf


def replace_ids_cache(cache, id_map):
    if 'grids' in cache:
        cache['grids'] = [id_map[i] if type(i) == int else i for i in cache['grids']]
    if 'sources' in cache:
        cache['sources'] = [id_map[i] if type(i) == int else i for i in cache['sources']]
    return cache

def replace_ids_layer(layer, id_map):
    if 'sources' in layer:
        layer['sources'] = [id_map[i] if type(i) == int else i for i in layer['sources']]
    return layer

def layer_tree(layers):
    root = []
    # add (sub)layers to parents
    for layer in layers.itervalues():
        parent = layer.pop('_parent')
        if parent is None:
            root.append(layer)
        else:
            layers[parent].setdefault('layers', []).append(layer)

    # order layers by rank
    for layer in layers.itervalues():
        if 'layers' in layer:
            layer['layers'].sort(key=lambda x: x['_rank'])

    # remove _ranks
    for layer in layers.itervalues():
        layer.pop('_rank')

    return root

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


class ConfigParser(object):
    """
    Utility class for parsing ini-style configurations with
    predefined default values..
    """

    """Default values, set by subclass"""
    defaults = {}

    def __init__(self, parser, fname):
        self.parser = parser
        self.fname = fname

    @classmethod
    def from_file(cls, fname):
        parser = _ConfigParser.ConfigParser()
        try:
            with open(fname) as fp:
                parser.readfp(fp)
        except Exception, ex:
            #XXXkai: logging?
            print 'Unable to read configuration: %s', ex
        return cls(parser, fname)

    def has_option(self, section, name):
        if self.parser.has_option(section, name):
            return True
        return name in self.defaults.get(section, {})

    def get(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.get(section, name)
        else:
            return self.defaults[section][name]

    def get_bool(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getboolean(section, name)
        else:
            return self.defaults[section][name]

    def get_int(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getint(section, name)
        else:
            return self.defaults[section][name]

    def set(self, section, name, value):
        if not self.defaults.has_key(section):
            raise _ConfigParser.NoSectionError(section)
        if not self.parser.has_section(section):
            self.parser.add_section(section)
        self.parser.set(section, name, value)

    def write(self):
        self.parser.write(open(self.fname, 'w'))
