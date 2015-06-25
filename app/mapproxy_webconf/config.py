import yaml

try:
    import ConfigParser as _ConfigParser
except ImportError:
    import configparser as _ConfigParser

from mapproxy.config.spec import validate_mapproxy_conf
from mapproxy.script.scales import scale_to_res
from mapproxy_webconf import utils
from mapproxy_webconf.constants import OGC_DPI, UNIT_FACTOR

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

                storage.add(section_name, project, {'data': item})
        elif section_name in ['sources', 'caches', 'grids']:
            for name, item in section.items():
                if item is None:
                    continue
                item['name'] = name
                storage.add(section_name, project, {'data': item})
        else:
            storage.add(section_name, project, {'data': section})

def id_dict_to_named_dict(input):
    output = {}
    for _, item in input.items():
        name = item.pop('name')
        output[name] = item
    return output

def create_id_name_map(*dicts):
    id_map = {}
    for d in dicts:
        for key, value in d.items():
            id_map[key] = value.get('name')

    return id_map

def validate(mapproxy_conf):
    # dont use for python 3 at this moment
    # mapproxy_conf = utils.convert(mapproxy_conf)

    errors, informal_only = validate_mapproxy_conf(mapproxy_conf)
    if not informal_only:
        return (errors, informal_only)

    #check for needed sections to run mapproxy
    errors = []
    sources_conf = mapproxy_conf.get('sources', False)
    if not sources_conf:
        errors.append(_('Missing sources section'))
    else:
        for name, source in sources_conf.items():
            if source.get('type', False) == 'wms':
                if source.get('req', False):
                    if not source['req'].get('url', False):
                        errors.append(_('Missing "url" for source %(source)s') % ({'source':name}))
                    if not source['req'].get('layers', False):
                        errors.append(_('Missing "layers" for source %(source)s') % ({'source':name}))
                else:
                    errors.append(_('Missing "req" for source %(source)s') % ({'source':name}))

    grids_conf = mapproxy_conf.get('grids', False)

    caches_conf = mapproxy_conf.get('caches', False)
    if caches_conf:
        for name, cache in caches_conf.items():
            sources = cache.get('sources', False)
            if sources:
                for source in sources:
                    if not sources_conf:
                        errors.append(_('Source %(source)s for cache %(cache)s not found in config') % ({'source':source, 'cache':name}))
                    elif source not in sources_conf.keys():
                        errors.append(_('Source %(source)s for cache %(cache)s not found in config') % ({'source':source, 'cache':name}))
            grids = cache.get('grids', False)
            if grids:
                for grid in grids:
                    known_grids = ['GLOBAL_MERCATOR', 'GLOBAL_GEODETIC', 'GLOBAL_WEBMERCATOR']
                    if grids_conf:
                        known_grids += grids_conf.keys()
                    if grid not in known_grids:
                        errors.append(_('Grid %(grid)s for cache %(cache)s not found in config') % ({'grid':grid, 'cache':name}))

    layers_conf = mapproxy_conf.get('layers', False)
    if not layers_conf:
        errors.append(_('Missing layers section'))
    else:
        for layer in layers_conf:
            sources = layer.get('sources', False)
            if not sources:
                errors.append(_('Missing sources for layer %(layer)s') % ({'layer':layer.name}))
            else:
                for source in sources:
                    found = False
                    if caches_conf and source in caches_conf.keys():
                        found = True
                    elif sources_conf and source in sources_conf.keys():
                        found = True
                    if not found:
                        errors.append(_('Source %(source)s for layer %(layer)s neither found in caches- nor in sources-section') % ({'source':source, 'layer':layer['name']}))

    services_conf = mapproxy_conf.get('services', False)
    if not services_conf:
        errors.append(_('Missing services section'))

    if not errors:
        return (None, True)
    return (errors, False)

def mapproxy_conf_from_storage(storage, project):
    mapproxy_conf = {}

    services = storage.get_all_data('services', project).values()
    if services:
        mapproxy_conf['services'] = {}
        for service, config in list(services)[0].items():
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

    defaults = storage.get_all_data('defaults', project)

    if sources:
        clear_min_max_res_scales(sources.values(), 'source', defaults)

    if layers:
        clear_min_max_res_scales(layers, 'layer', defaults)

    if grids:
        dpi = float(list(defaults.values())[0].get('dpi', OGC_DPI))
        for grid in grids.items():
            if 'scales' in grid[1].keys():
                units = grid[1].get('units', 'm')
                units = 1 if units == 'm' else UNIT_FACTOR
                try:
                    grid[1]['res'] = [round(scale_to_res(float(scale), dpi, units), 9) for scale in grid[1]['scales']]
                except ValueError:
                    raise ConfigError(_('grid %(grid)s contains invalid value in scales section') % ({'grid':grid[1].get('name', '')}))
                del grid[1]['scales']
            try:
                del grid[1]['units']
            except KeyError:
                pass

    used_caches, used_sources = used_caches_and_sources(layers, caches, sources)

    used_grids = find_cache_grids(caches).union(find_source_grids(sources))

    id_map = create_id_name_map(sources, caches, grids)

    if layers:
        mapproxy_conf['layers'] = [replace_ids_layer(l, id_map) for l in layers]
        for layer in mapproxy_conf['layers']:
            if 'sources' in layer:
                layer['sources'] = list(reversed(layer['sources']))

    if used_caches:
        mapproxy_conf['caches'] = id_dict_to_named_dict(dict((k, replace_ids_cache(caches[k], id_map)) for k in used_caches))
    if used_sources:
        mapproxy_conf['sources'] = id_dict_to_named_dict(dict((k, sources[k]) for k in used_sources))
    if used_grids:
        mapproxy_conf['grids'] = id_dict_to_named_dict(dict((k, grids[k]) for k in used_grids if type(k) == int))

    if 'sources' in mapproxy_conf:
        for source in mapproxy_conf['sources'].values():
            if 'req' in source and 'layers' in source['req']:
                source['req']['layers'] = ','.join(reversed(source['req']['layers']))
    return mapproxy_conf

def clear_min_max_res_scales(data_elements, element_type, defaults):
    dpi = float(list(defaults.values())[0].get('dpi', OGC_DPI))
    for data_element in data_elements:
        units = data_element.get('units', 'm')
        units = 1 if units == 'm' else UNIT_FACTOR
        for key in ['min_res_scale', 'max_res_scale']:
            if key in data_element.keys():
                mapproxy_conf_key = key[:7] # remove '_scale'
                try:
                    data_element[mapproxy_conf_key] = round(scale_to_res(float(data_element[key]), dpi, units), 9)
                except ValueError:
                    raise ConfigError(_('%(type)s %(name)s contains invalid value in %(item)s item') % ({'type':element_type, 'name':data_element.get('name', ''), 'item':key}))
                del data_element[key]
        try:
            del data_element['units']
        except KeyError:
            pass

def replace_ids_cache(cache, id_map):
    if 'grids' in cache:
        cache['grids'] = [id_map[i] if type(i) == int else i for i in cache['grids']]
    if 'sources' in cache:
        cache['sources'] = [id_map[i] if type(i) == int else i for i in cache['sources']]
    return cache

def replace_ids_layer(layer, id_map):
    if 'sources' in layer:
        layer['sources'] = [id_map[i] if type(i) == int and i in id_map else i for i in layer['sources']]
    return layer

def layer_tree(layers):
    root = []
    # add (sub)layers to parents
    for layer in layers.values():
        parent = layer.pop('_parent')
        if parent is None:
            root.append(layer)
        else:
            layers[parent].setdefault('layers', []).append(layer)

    # order layers by rank
    for layer in layers.values():
        if 'layers' in layer:
            layer['layers'].sort(key=lambda x: x['_rank'])

    # remove _ranks
    for layer in layers.values():
        layer.pop('_rank')

    return root

def used_caches_and_sources(layers, caches, sources):
    """
    Find used cache and source names in layers and caches configuration.
    """
    used_layer_sources = find_layer_sources(layers)
    used_cache_sources = find_cache_sources(caches)
    all_used_sources = used_layer_sources.union(used_cache_sources)

    avail_caches = set(caches.keys())
    avail_sources = set(sources.keys())

    used_caches = avail_caches.intersection(all_used_sources)
    used_sources = avail_sources.intersection(all_used_sources).difference(used_caches)

    return used_caches, used_sources

def find_cache_grids(cache_conf):
    grids = set()
    for cache in cache_conf.values():
        grids.update(cache.get('grids', []))
    return grids

def find_source_grids(source_conf):
    grids = set()
    for source in source_conf.values():
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
    for cache in caches_conf.values():
        sources.update(cache.get('sources', []))
    return sources


class ConfigParser(object):
    """
    Utility class for parsing ini-style configurations with
    predefined default values..
    """

    """Default values, set by subclass"""
    defaults = {
        'app': {
            'demo': False,
            'output_path': '/tmp/',
            'storage_path': './',
            'sqlite_db' : 'mapproxy.sqlite',
            'language' : 'en',
            'supported_languages': 'en,de',
        }
    }

    def __init__(self, parser, fname):
        self.parser = parser
        self.fname = fname

    @classmethod
    def from_file(cls, fname):
        parser = _ConfigParser.ConfigParser()
        try:
            with open(fname) as fp:
                parser.readfp(fp)
        except IOError as ex:
            print('Configuration file not found. Use default configuration.')
            print('%s' % ex)
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
        if not section in self.defaults:
            raise _ConfigParser.NoSectionError(section)
        if not self.parser.has_section(section):
            self.parser.add_section(section)
        self.parser.set(section, name, value)

    def write(self):
        self.parser.write(open(self.fname, 'w'))
