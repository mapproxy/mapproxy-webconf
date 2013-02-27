angular.module('mapproxy_gui.services', ['mapproxy_gui.resources']).

service('WMSSources', function($rootScope, GetCapabilitiesResource) {
    var wms_list = {};

    var load = function() {
        GetCapabilitiesResource.query(function(result) {
            if(result) {
                angular.forEach(result, function(item) {
                    wms_list[item._id] = item;
                })
                $rootScope.$broadcast('wms_list_refreshed');
            }
        })
    }

    var addCapabilities = function(url) {
        var cap = new GetCapabilitiesResource({url: url});
        cap.$save(function(result) {
            console.log(result)
            wms_list[result._id] = result;
            $rootScope.$broadcast('wms_list_refreshed');
        });
    };

    var layerTitle = function(url, layer_name) {
        var title = false
        angular.forEach(wms_list, function(wms) {
            if(wms.url == url) {
                angular.forEach(wms.layer.layers, function(layer) {
                    if(layer.name == layer_name) {
                        title = layer.title;
                    }
                });
            }
        });
        return title;
    };
    var wmsList = function() {
        return wms_list;
    }

    load();

    return {
        refresh: load,
        addCapabilities: addCapabilities,
        layerTitle: layerTitle,
        wmsList: wmsList
    };
}).

service('MapproxySources', function($rootScope, MapproxySourceResource) {
    var _sources = {};
    var current;

    var load = function() {
        MapproxySourceResource.query(function(result) {
            angular.forEach(result, function(item) {
                _sources[item._id] = item;
            })
            $rootScope.$broadcast('mapproxy_sources.load_complete');
        });
    };
    var add = function(source) {
        if(angular.isUndefined(source._id)) {
            var source = new MapproxySourceResource(source);
            source.$save(function(result) {
                _sources[result._id] = result;
                $rootScope.$broadcast('mapproxy_sources.source_added');
            });
        } else {
            source.$update({id: source._id}, function(result) {
                _sources[result._id] = result;
                $rootScope.$broadcast('mapproxy_sources.source_updated');
            });
        }
    };
    var remove = function(source) {
        source.$delete({id: source._id}, function(result) {
            delete(_sources[result._id]);
        });
    };
    var list = function() {
        return dict2list(_sources);
    };
    var setCurrent = function(source, copy) {
        if(copy) {
            current = angular.copy(source);
        } else {
            current = source;
        }
        $rootScope.$broadcast('mapproxy_sources.current');
    };
    var getCurrent= function() {
        if(current) {
            return current;
        }
    };

    //initial load data from server
    load();

    return {
        refresh: load,
        add: add,
        remove: remove,
        list: list,
        setCurrent: setCurrent,
        getCurrent: getCurrent
    };
}).

service('MapproxyCaches', function($rootScope) {
    var caches = {};
    var current;
    return {
        add: function(name, value) {
            caches[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_caches.list');
        },
        byName: function(name) {
            return caches[name];
        },
        list: function() {
            var result = [];
            for(var key in caches) {
                result.push(caches[key]);
            }
            return result;
        },
        setCurrent: function(cache, copy) {
            if(copy) {
                current = angular.copy(cache);
            } else {
                current = cache;
            }
            $rootScope.$broadcast('mapproxy_caches.current');
        },
        getCurrent: function(cache) {
            if(current) {
                return current;
            }
        }
    };
}).

service('MapproxyLayers', function($rootScope, MapproxyLayerResource) {
    var layers = {};
    var current;

    var load = function() {
        //can't use query. resource returns no array.
        MapproxyLayerResource.get(function(result) {
            angular.forEach(result['tree'], function(item) {
                layers[item._id] = item;
            });
            $rootScope.$broadcast('mapproxy_layers.load_complete')
        });
    };
    var add = function(layer) {
        if(angular.isUndefined(layer._id)) {
            var layer = new MapproxyLayerResource(layer);
            layer.$save(function(result) {
                layers[result._id] = result;
                $rootScope.$broadcast('mapproxy_layers.added');
            });
        } else {
            layer.$update({id: layer._id}, function(result) {
                layers[result._id] = result;
                $rootScope.$broadcast('mapproxy_layers.updated');
            });
        }
    };
    var remove = function(layer) {
        layer.$delete({id: layer._id}, function(result) {
            delete(layers[result._id]);
        });
    };

    var list = function() {
        return dict2list(_layers)
    };

    var setCurrent = function(layer, copy) {
        if(copy) {
            current = angular.copy(layer);
        } else {
            current = layer;
        }
        $rootScope.$broadcast('mapproxy_layers.current');
    };

    var getCurrent = function(layer) {
        if(current) {
            return current;
        }
    };

    load();

    return {
        refresh: load,
        add: add,
        list: list,
        setCurrent: setCurrent,
        getCurrent: getCurrent
    };
});
