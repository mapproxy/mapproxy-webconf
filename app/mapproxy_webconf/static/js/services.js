var MapproxyBaseService = function(_section, _model, _preloadedData) {
    var _this = this;
    this._items = {};
    this._item;
    this._last;
    this._section = _section;
    this._action;
    this._model = _model;
    this._rootScope;
    this._resource;
    this._messageService;
    this.error;

    if(angular.isDefined(_preloadedData)) {
        _this._preloadedData = {};
        angular.forEach(_preloadedData, function(dataObject, idx) {
            dataObject.data = $.extend(true, {}, _this._model, dataObject.data);
            _this._preloadedData[idx] = dataObject;
        });
    }

    this._errorMessageHandler = function(error) {
        _this._rootScope.$broadcast(_this._section + '.' + _this._action + '_error');
        _this._messageService.message(_this._section, _this._action + '_error', error.data.error);
        _this._messageService.notifyOnly(_this._section, 'request_end');
    };
    this._successMessageHandler = function(msg) {
        _this._messageService.message(_this._section, _this._action + '_success', msg);
        _this._messageService.notifyOnly(_this._section, 'request_end');
    };
    this._removeNonModelProperties = function(data) {
        var cleanup = function(cleanData, data) {
            var _data = {};
            angular.forEach(cleanData, function(value, key) {
                if(angular.isObject(cleanData[key]) && !angular.isArray(cleanData[key])) {
                    _data[key] = cleanup(cleanData[key], data[key]);
                } else {
                    if(angular.isDefined(data) && !helper.isEmpty(data)) {
                        _data[key] = data[key]
                    }
                }
            });
            return !helper.isEmpty(_data) ? _data : undefined;
        };
        return cleanup(_this._model, data);;
    };
    this._beforeRequest = function() {
        _this._messageService.notifyOnly(_this._section, 'request_start');
    };
    this.load = function() {
        _this._items = {};
        _this._loaded = false;
        _this._action = 'load';
        _this._loadingInProgress = true;
        _this._beforeRequest();
        _this._resource.query({action: _this._section}, function(result) {
            if(result) {
                angular.forEach(result, function(item) {
                    item._section = _this._section;
                    item.data = $.extend(true, {}, _this._model, item.data)
                    _this._items[item._id] = item;
                });
                _this._loaded = true;
                _this._loadingInProgress = false;
                _this._successMessageHandler(_this._translationService.translate('Load complete'));
                if(angular.isDefined(_this._rootScope))
                    _this._rootScope.$broadcast(_this._section + '.load_finished');
            }
        }, _this._errorMessageHandler);
    };
    this.add = function(_item) {
        if(_this._model && !_item._manual) {
            _item.data = _this._removeNonModelProperties(_item.data);
        }
        var item = new _this._resource(_item);
        delete item._section;
        if(angular.isUndefined(item._id)) {
            _this._action = 'add';
            _this._beforeRequest();
            item.$save({action: _this._section},
                function(result) {
                    result._section = _this._section;
                    result.data = $.extend(true, {}, _this._model, result.data);
                    _this._items[result._id] = result;
                    _this._successMessageHandler(_this._translationService.translate('Successful added'));
                    if(angular.isDefined(_this._rootScope)) {
                        _this._last = result;
                        _this.current(result);
                    }
                }, _this._errorMessageHandler);
        } else {
            _this._action = 'update';
            _this._beforeRequest();
            item.$update({action: _this._section, id: item._id}, function(result) {
                result._section = _this._section;
                result.data = $.extend(true, {}, _this._model, result.data);
                _this._items[result._id] = result;
                _this._successMessageHandler(_this._translationService.translate('Successful updated'));
                if(angular.isDefined(_this._rootScope)) {
                    _this._last = result;
                    _this.current(result);
                }
            }, _this._errorMessageHandler);
        }
    };
    this.remove = function(_item) {
        var item = new _this._resource(_item)
        _this._action = 'delete';
        _this._beforeRequest();
        item.$delete({action: _this._section, id: item._id}, function(result) {
            delete(_this._items[result._id]);
            _this._successMessageHandler(_this._translationService.translate('Successful deleted'));
        }, function(response) {
            if(response.status == 405) {
                _this._messageService.message(_this._section, _this._action + '_has_dependencies', response.data);
            } else {
                _this._errorMessageHandler(response)
            }
        });
    };
    this.list = function() {
        var result = [];
        for(var key in _this._items) {
            result.push(_this._items[key]);
        }
        return result;
    };
    this.byId = function(_id) {
        return angular.isDefined(_this._items[_id]) ? _this._items[_id] : false;
    };
    this.byName = function(_name) {
        for(var id in _this._items) {
            if(_this._items[id].data.name == _name) {
                return _this._items[id];
            }
        }
        return false;
    };
    this.idByName = function(_name) {
        var item = _this.byName(_name);
        return item ? item._id : false;

    };
    this.nameById = function(_id) {
        var item = _this.byId(_id);
        return item ? item.data.name : false;
    };
    this.current = function(_item) {
        if(_item) {
            _this._item = _item;
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.current');
        } else {
            return angular.copy($.extend(true, {}, {'data': _this._model}, _this._item));
        }
    };
    this.last = function() {
        return _this._last;
    };
    this.error = function() {
        return _this._error_msg;
    }
    this.return_func = function($rootScope, MapproxyResource, MessageService, TranslationService) {
        _this._rootScope = $rootScope;
        _this._resource = MapproxyResource;
        _this._messageService = MessageService;
        _this._translationService = TranslationService;
        _this._rootScope.$on(_this._section + '.load_finished', _this._waitForLoadComplete);
        _this._loaded = true;
        _this._loadingInProgress = false;
        _this._items = _this._preloadedData;
        return _this.return_dict;
    };

    this.return_dict = {
        refresh: _this.load,
        add: _this.add,
        remove: _this.remove,
        list: _this.list,
        byId: _this.byId,
        byName: _this.byName,
        idByName: _this.idByName,
        nameById: _this.nameById,
        current: _this.current,
        last: _this.last,
        error: _this.error,
        section: _this._section,
        model: _this._model
    }
};

var MapproxyLayerService = function(_section, _model, _preloadedData) {
    MapproxyBaseService.call(this, _section, _model, _preloadedData);
    var _this = this;

    this.prepareLayer = function(store, layer, idx, parent_id) {
        if(angular.isDefined(layer._layers)) {
            angular.forEach(layer._layers, function(child_layer, _idx) {
                _this.prepareLayer(store, child_layer, _idx, layer._id);
            });
        }
        store.push({_id: layer._id, _rank: idx, _parent: parent_id})
    };

    this.tree = function(parent_id) {
        var treeStructure = [];
        var items = angular.copy(_this._items);
        angular.forEach(items, function(item) {
            if(item._parent == null) {
                if($.inArray(item, treeStructure) == -1) {
                    treeStructure.push(item);
                }
            } else {
                if(angular.isArray(items[item._parent]._layers)) {
                    if($.inArray(item, items[item._parent]) == -1) {
                        items[item._parent]._layers.push(item)
                    }
                } else {
                    items[item._parent]._layers = [item]
                }
            }
        });
        return treeStructure;
    };

    this.updateStructure = function(tree) {
        var to_update = [];
        _this._action = 'updateStructure';
        angular.forEach(tree, function(layer, idx) {
            _this.prepareLayer(to_update, layer, idx);
        });
        to_update = new _this._resource({'tree': to_update});
        _this._beforeRequest();
        to_update.$update({action: _this._section}, function(result) {
            _this._successMessageHandler(_this._translationService.translate('Structure successful updated'));
        }, _this._errorMessageHandler);
    };

    this.return_dict['tree'] = _this.tree;
    this.return_dict['updateStructure'] = _this.updateStructure;
};

WMSSourceService = function(_section, _model, _preloadedData) {
    MapproxyBaseService.call(this, _section, _model, _preloadedData);
    var _this = this;

    this._addSourceURL = function(layer, sourceURL) {
        layer.sourceURL = sourceURL;
        if(angular.isDefined(layer.layers)) {
            angular.forEach(layer.layers, function(layer) {
                _this._addSourceURL(layer, sourceURL);
            });
        }
    };
    this.list = function() {
        var result = [];
        angular.forEach(_this._items, function(item) {
            var sourceURL = item.data.url;
            angular.forEach(item.data.layer.layers, function(layer) {
                _this._addSourceURL(layer, sourceURL)
            });
        });
        for(var key in _this._items) {
            result.push(_this._items[key]);
        }
        return result;
    };
    this._identifySource = function(url) {
        var source = false;
        angular.forEach(_this._items, function(_source) {
            if(_source.data.url == url) {
                source = _source;
            }
        });
        return source;
    };
    this._identifyLayer = function(layers, layerName) {
        var layer = false;
        angular.forEach(layers, function(_layer) {
            if(!layer) {
                if(_layer.name == layerName) {
                    layer = _layer;
                } else if(angular.isDefined(_layer.layers)) {
                    layer = _this._identifyLayer(_layer.layers, layerName);
                }
            }
        });
        return layer;
    };

    this.layerTitle = function(url, layerName) {
        var source = _this._identifySource(url);
        if(source) {
            var layer = _this._identifyLayer(source.data.layer.layers, layerName);
            if(layer) {
                return layer.title;
            }
        }
        return false;
    };

    this.coverage = function(url) {
        var source = _this._identifySource(url);
        if(source) {
            return source.data.layer.llbbox;
        }
        return false;
    };

    this.srs = function(url) {
        var source = _this._identifySource(url);
        if(source) {
            return source.data.layer.srs;
        }
        return false;
    };

    this.refresh = function(_item) {
        var item = new _this._resource(_item);
        _this._action = 'update';
        _this._beforeRequest();
        item.$update({action: _this._section, id: item._id}, function(result) {
            _this._items[result._id] = result;
            _this._last = result;
            _this._successMessageHandler(_this._translationService.translate('Successful updated'));
        }, _this._errorMessageHandler);
    };

    this.allURLs = function() {
        var result = [];
        angular.forEach(_this._items, function(wms) {
            result.push(wms.url);
        });
        return result;
    };

    this.return_dict['list'] = _this.list;
    this.return_dict['layerTitle'] = _this.layerTitle;
    this.return_dict['refresh'] = _this.refresh;
    this.return_dict['allURLs'] = _this.allURLs;
    this.return_dict['coverage'] = _this.coverage;
    this.return_dict['srs'] = _this.srs;
};

var layerModel = {
    'name': undefined,
    'title': undefined,
    'sources': [],
    'units': 'm',
    'min_res': undefined,
    'max_res': undefined,
    'min_res_scale': undefined,
    'max_res_scale': undefined
};
var globalsModel = {
    'cache': {
        'meta_size': [],
        'meta_buffer': undefined
    },
    'image': {
        'resampling_method': undefined,
        'paletted': undefined
    }
};
var cacheModel = {
    'name': undefined,
    'sources': [],
    'grids': [],
    'format': undefined,
    'request_format': undefined
};
var gridModel = {
    'name': undefined,
    'srs': undefined,
    'bbox': [],
    'bbox_srs': undefined,
    'origin': undefined,
    'res': [],
    'scales': [],
    'units': 'm'
};
var sourceModel = {
    'type': 'wms',
    'name': undefined,
    'req': {
        'url': undefined,
        'layers': [],
        'transparent': undefined
    },
    'coverage': {
        'bbox': [],
        'bbox_srs': undefined,
        'polygon': [],
        'polygon_srs': undefined
    },
    'supported_srs': [],
    'supported_formats': [],
    'min_res_scale': undefined,
    'max_res_scale': undefined,
    'min_res': undefined,
    'max_res': undefined
};
var defaultsModel = {
    'dpi': undefined,
    'srs': []
};
var servicesModel = {
    'demo': {
        'active': undefined
    },
    'kml': {
        'active': undefined
    },
    'tms': {
        'active': undefined
    },
    'wms': {
        'active': undefined,
        'srs': undefined,
        'md': {
            'title': undefined,
            'abstract': undefined,
            'online_resource': undefined,
            'fees': undefined,
            'access_constraints': undefined,
            'contact': {
                'person': undefined,
                'position': undefined,
                'organization': undefined,
                'address': undefined,
                'city': undefined,
                'postcode': undefined,
                'country': undefined,
                'phone': undefined,
                'fax': undefined,
                'email': undefined
    }}},
    'wmts': {
        'active': undefined
    }
};

//ensure variables are defined
var preloaded_layers = preloaded_layers || undefined;
var preloaded_globals = preloaded_globals || undefined;
var preloaded_services = preloaded_services || undefined;
var preloaded_caches = preloaded_caches || undefined;
var preloaded_grids = preloaded_grids || undefined;
var preloaded_sources = preloaded_sources || undefined;
var preloaded_wms_capabilities = preloaded_wms_capabilities || undefined;
var preloaded_defaults = preloaded_defaults || undefined;

var layerService = new MapproxyLayerService('layers', layerModel, preloaded_layers);
var globalsService = new MapproxyBaseService('globals', globalsModel, preloaded_globals);
var servicesService = new MapproxyBaseService('services', servicesModel, preloaded_services);
var cacheService = new MapproxyBaseService('caches', cacheModel, preloaded_caches);
var gridService = new MapproxyBaseService('grids', gridModel, preloaded_grids);
var sourceService = new MapproxyBaseService('sources', sourceModel, preloaded_sources);
var wmsService = new WMSSourceService('wms_capabilities', undefined, preloaded_wms_capabilities);
var defaultsService = new MapproxyBaseService('defaults', defaultsModel, preloaded_defaults);

angular.module('mapproxy_gui.services', ['mapproxy_gui.resources']).

service('WMSSources', wmsService.return_func).
service('MapproxySources', sourceService.return_func).
service('MapproxyCaches', cacheService.return_func).
service('MapproxyGrids', gridService.return_func).
service('MapproxyLayers', layerService.return_func).
service('MapproxyGlobals', globalsService.return_func).
service('MapproxyServices', servicesService.return_func).
service('ProjectDefaults', defaultsService.return_func).

service('DataShareService', function($rootScope) {
    var _this = this;
    this._data = {};

    return {
        data: function(key, value) {
            if(angular.isDefined(value)) {
                _this._data[key] = value;
                $rootScope.$broadcast('dss.' + key);
            } else {
                if(angular.isDefined(_this._data[key])) {
                    return angular.copy(_this._data[key]);
                } else {
                    return undefined;
                }
            }
        }
    }
}).

factory('TranslationService', function() {
    var translationService = {
        translations: {},
        setDict: function(dict) {
            translationService.translations = dict;
        },
        translate: function(key) {
            return translationService.translations[key]
        }
    }
    return translationService;
});
