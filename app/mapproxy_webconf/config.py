import yaml
import ConfigParser as _ConfigParser
from mapproxy.config.spec import validate_mapproxy_conf
from mapproxy.script.scales import scale_to_res
from mapproxy_webconf import utils

class ConfigError(Exception):
    pass

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
    conf_dict = utils.convert(mapproxy_conf)
    #check given mapproxy config against specs

    errors, informal_only = validate_mapproxy_conf(conf_dict)
    if not informal_only:
        return (errors, informal_only)

    #check for needed sections to run mapproxy
    errors = []
    sources_conf = conf_dict.get('sources', False)
    if not sources_conf:
        errors.append('Missing sources section')
    else:
        for name, source in sources_conf.items():
            if source.get('type', False) == 'wms':
                if source.get('req', False):
                    if not source['req'].get('url', False):
                        errors.append('Missing "url" for source %s' % name)
                    if not source['req'].get('layers', False):
                        errors.append('Missing "layers" for source %s' % name)
                else:
                    errors.append('Missing "req" for source %s' % name)

    grids_conf = conf_dict.get('grids', False)

    caches_conf = conf_dict.get('caches', False)
    if caches_conf:
        for name, cache in caches_conf.items():
            sources = cache.get('sources', False)
            if sources:
                for source in sources:
                    if not sources_conf:
                        errors.append('Source %s for cache %s not found in config' % (source, name))
                    elif source not in sources_conf.keys():
                        errors.append('Source %s for cache %s not found in config' % (source, name))
            grids = cache.get('grids', False)
            if grids:
                for grid in grids:
                    known_grids = ['GLOBAL_MERCATOR', 'GLOBAL_GEODETIC']
                    if grids_conf:
                        known_grids += grids_conf.keys()
                    if grid not in known_grids:
                        errors.append('Grid %s for cache %s not found in config' % (grid, name))

    layers_conf = conf_dict.get('layers', False)
    if not layers_conf:
        errors.append('Missing layers section')
    else:
        for layer in layers_conf:
            sources = layer.get('sources', False)
            if not sources:
                errors.append('Missing sources for layer %s' % layer['name'])
            else:
                for source in sources:
                    found = False
                    if caches_conf and source in caches_conf.keys():
                        found = True
                    elif sources_conf and source in sources_conf.keys():
                        found = True
                    if not found:
                        errors.append('Source %s for layer %s neither found in caches- nor in sources-section' % (source, layer['name']))

    services_conf = conf_dict.get('services', False)
    if not services_conf:
        errors.append('Missing services section')

    if not errors:
        return (None, True)
    return (errors, False)

def mapproxy_conf_from_storage(storage, project):
    mapproxy_conf = {}

    services = storage.get_all_data('services', project).values()
    if services:
        mapproxy_conf['services'] = {}
        for service, config in services[0].items():
            if 'active' in config and config['active']:
                config.pop('active', None)
                mapproxy_conf['services'][service] = config

    _globals = storage.get_all_data('globals', project).values()
    if _globals:
        mapproxy_conf['globals'] = _globals[0]

    used_sources = set()
    used_caches = set()

    sources = storage.get_all_data('sources', project)
    caches = storage.get_all_data('caches', project)
    layers = storage.get_all_data('layers', project).values()
    grids = storage.get_all_data('grids', project)

    if grids:
        defaults = storage.get_all_data('defaults', project)
        dpi = defaults.values()[0].get('dpi', (2.54/(0.00028 * 100)))
        for grid in grids.items():
            if 'scales' in grid[1].keys():
                try:
                    grid[1]['res'] = [scale_to_res(float(scale), dpi, 1) for scale in grid[1]['scales']]
                except ValueError:
                    raise ConfigError('grid %s contains invalid value in scales section' % grid[1].get('name', ''))
                del grid[1]['scales']

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
