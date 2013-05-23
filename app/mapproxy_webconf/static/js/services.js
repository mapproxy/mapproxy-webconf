var MapproxyBaseService = function(_section, _dependencies) {
    var _this = this;
    this._items = {};
    this._item;
    this._last;
    this._section = _section;
    this._action;
    this._dependencies = _dependencies;
    this._rootScope;
    this._resource;
    this.error;

    this._errorHandler = function(error) {
        _this._error_msg = error.data.error;
        _this._rootScope.$broadcast(_this._section + _this._action + '_error');
    };
    this._addDependencies = function(item) {
        item._dependencies = {};
        angular.forEach(_this._dependencies, function(dependency) {
            item._dependencies[dependency._section] = []
            angular.forEach(dependency._items, function(dependencyItem) {
                var useSection = _this._section;
                //layers only have sources for cache- and source-items
                if(item._section == 'caches' && dependencyItem._section == 'layers') {
                    useSection = 'sources';
                }
                if($.inArray(item._id, dependencyItem.data[useSection]) != -1) {
                    item._dependencies[dependency._section].push(dependencyItem);
                }
            });
        });
    };
    this._waitForLoadComplete = function(event) {
        var name = event.name.split('.')[0];
        var loadComplete = _this._loaded;
        angular.forEach(_this.dependencies, function(dependency) {
            if(!dependency._loaded) {
                loadComplete = false;
            }
        });
        if(loadComplete) {
            angular.forEach(_this._items, _this._addDependencies);
            _this._rootScope.$broadcast(_this._section + '.load_complete');
        }
    };
    this.load = function() {
        _this._items = {};
        _this._loaded = false;
        _this._action = '.load';
        _this._resource.query({action: _this._section}, function(result) {
            if(result) {
                angular.forEach(result, function(item) {
                    item._section = _this._section;
                    _this._items[item._id] = item;
                });
                _this._loaded = true;
                if(angular.isDefined(_this._rootScope))
                    _this._rootScope.$broadcast(_this._section + '.load_finished');
            }
        }, _this._errorHandler);
    };
    this.add = function(_item) {
        var item = new _this._resource(_item);
        delete item._dependencies;
        delete item._section;
        if(angular.isUndefined(item._id)) {
            _this._action = '.add';
            item.$save({action: _this._section},
                function(result) {
                    result._section = _this._section;
                    _this._addDependencies(result);
                    _this._items[result._id] = result;
                    if(angular.isDefined(_this._rootScope)) {
                        _this._last = result;
                        _this._rootScope.$broadcast(_this._section + '.added');
                        _this.current(true, result);

                    }
                }, _this._errorHandler);
        } else {
            _this._action = '.update';
            item.$update({action: _this._section, id: item._id}, function(result) {
                result._section = _this._section;
                _this._addDependencies(result);
                _this._items[result._id] = result;
                if(angular.isDefined(_this._rootScope)) {
                    _this._last = result;
                    _this._rootScope.$broadcast(_this._section + '.updated');
                    _this.current(true, result);
                }
            }, _this._errorHandler);
        }
    };
    this.remove = function(_item) {
        var item = new _this._resource(_item)
        _this._action = '.delete';
        item.$delete({action: _this._section, id: item._id}, function(result) {
            delete(_this._items[result._id]);
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.deleted');
        }, _this._errorHandler);
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
    this.current = function(copy, _item) {
        if(_item) {
            _this._item = _item;
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.current');
        } else {
            return copy ? angular.copy(_this._item) : _this._item;
        }
    };
    this.last = function() {
        return _this._last;
    };
    this.error = function() {
        return _this._error_msg;
    }
    this.return_func = function($rootScope, MapproxyResource) {
        _this._inited = true;
        _this._rootScope = $rootScope;
        _this._resource = MapproxyResource;
        _this._rootScope.$on(_this._section + '.load_finished', _this._waitForLoadComplete);
        angular.forEach(_this._dependencies, function(dependency) {
            _this._rootScope.$on(dependency._section + '.load_finished', _this._waitForLoadComplete)
            if(!dependency._inited) {
              dependency.return_func(_this._rootScope, _this._resource);
            }

        });
        _this.load();
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
        error: _this.error
    }
};

var MapproxyLayerService = function(_section) {
    MapproxyBaseService.call(this, _section);
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
        _this._action = '.updateStructure';
        angular.forEach(tree, function(layer, idx) {
            _this.prepareLayer(to_update, layer, idx);
        });
        to_update = new _this._resource({'tree': to_update});
        to_update.$update({action: _this._section}, function(result) {
            _this._rootScope.$broadcast(_this._section + '.updatedStructure');
        }, _this._errorHandler);
    };

    this.return_dict['tree'] = _this.tree;
    this.return_dict['updateStructure'] = _this.updateStructure;
};

WMSSourceService = function(_section) {
    MapproxyBaseService.call(this, _section);
    var _this = this;

    this._identifySource = function(url) {
        var source = false;
        angular.forEach(_this._items, function(_source) {
            if(_source.data.url == url) {
                source = _source;
            }
        });
        return source;
    };
    this._identifyLayer = function(url, layerName) {
        var layer = false;
        var source = _this._identifySource(url);
        if(source) {
            angular.forEach(source.data.layer.layers, function(_layer) {
                if(_layer.name == layerName) {
                    layer = _layer;
                }
            });
        }
        return layer;
    };

    this.layerTitle = function(url, layerName) {
        var layer = _this._identifyLayer(url, layerName);
        if(layer) {
            return layer.title;
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
        _this._action = '.update';
        item.$update({action: _this._section, id: item._id}, function(result) {
            _this._items[result._id] = result;
            _this._last = result;
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.updated');
        }, _this._errorHandler);
    };

    this.allURLs = function() {
        var result = [];
        angular.forEach(_this._items, function(wms) {
            result.push(wms.url);
        });
        return result;
    }

    this.return_dict['layerTitle'] = _this.layerTitle;
    this.return_dict['refresh'] = _this.refresh;
    this.return_dict['allURLs'] = _this.allURLs;
    this.return_dict['coverage'] = _this.coverage;
    this.return_dict['srs'] = _this.srs;
};

var layerService = new MapproxyLayerService('layers');
var globalsService = new MapproxyBaseService('globals');
var servicesService = new MapproxyBaseService('services');
var cacheService = new MapproxyBaseService('caches', [layerService]);
var gridService = new MapproxyBaseService('grids', [cacheService]);
var sourceService = new MapproxyBaseService('sources', [cacheService, layerService]);
var wmsService = new WMSSourceService('wms_capabilities');
var defaultsService = new MapproxyBaseService('defaults');

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
                    return _this._data[key];
                } else {
                    return undefined;
                }
            }
        }
    }
});
