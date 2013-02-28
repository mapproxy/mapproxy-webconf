angular.module('mapproxy_gui.services', ['mapproxy_gui.resources']).

service('WMSSources', function($rootScope, MapproxyResource) {
    var wms_list = {};
    var load = function() {
        MapproxyResource.query({action: 'wms_capabilities'}, function(result) {
            if(result) {
                angular.forEach(result, function(item) {
                    wms_list[item._id] = item;
                })
                $rootScope.$broadcast('wms_sources.load_complete');
            }
        })
    }

    var addCapabilities = function(url) {
        var cap = new MapproxyResource({url: url});
        cap.$save({action: 'wms_capabilities'}, function(result) {
            wms_list[result._id] = result;
            $rootScope.$broadcast('wms_sources.add');
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

service('MapproxySources', function($rootScope, MapproxyResource) {
    var _sources = {};
    var current;

    var load = function() {
        MapproxyResource.query({action: 'sources'}, function(result) {
            angular.forEach(result, function(item) {
                _sources[item._id] = item;
            })
            $rootScope.$broadcast('mapproxy_sources.load_complete');
        });
    };
    var add = function(source) {
        if(angular.isUndefined(source._id)) {
            var source = new MapproxyResource(source);
            source.$save({action: 'sources'}, function(result) {
                _sources[result._id] = result;
                $rootScope.$broadcast('mapproxy_sources.added');
            });
        } else {
            source.$update({action: 'sources', id: source._id}, function(result) {
                _sources[result._id] = result;
                $rootScope.$broadcast('mapproxy_sources.updated');
            });
        }
    };
    var remove = function(source) {
        source.$delete({action: 'sources', id: source._id}, function(result) {
            delete(_sources[result._id]);
            $rootScope.$broadcast('mapproxy_sources.deleted');
        });
    };
    var list = function() {
        return dict2list(_sources);
    };
    var nameById = function(_id) {
        return angular.isDefined(_sources[_id]) ? _sources[_id].name : false;
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
        nameById: nameById,
        setCurrent: setCurrent,
        getCurrent: getCurrent
    };
}).

service('MapproxyCaches', function($rootScope, MapproxyResource) {
    var _caches = {};
    var current;

    var load = function() {
        MapproxyResource.query({action: 'caches'}, function(result) {
            angular.forEach(result, function(item) {
                _caches[item._id] = item;
            });
            $rootScope.$broadcast('mapproxy_caches.load_complete');
        });
    };
    var add = function(cache) {
        if(angular.isUndefined(cache._id)) {
            var cache = new MapproxyResource(cache);
            cache.$save({action: 'caches'}, function(result) {
                _caches[result._id] = result;
                $rootScope.$broadcast('mapproxy_caches.added');
            });
        } else {
            cache.$update({action: 'action', id: cache._id}, function(result) {
                _caches[result._id] = result;
                $rootScope.$broadcast('mapproxy_caches.updated');
            });
        }
    };
    var remove = function(cache) {
        cache.$delete({action: 'action', id: cache._id}, function(result) {
            delete(_caches[result._id]);
            $rootScope.$broadcast('mapproxy_caches.deleted');
        })
    };
    var list = function() {
        return dict2list(_caches);
    };
    var nameById = function(_id) {
        return angular.isDefined(_caches[_id]) ? _caches[_id].name : false;
    }
    var setCurrent = function(cache, copy) {
        if(copy) {
            current = angular.copy(cache);
        } else {
            current = cache;
        }
        $rootScope.$broadcast('mapproxy_caches.current');
    };
    var getCurrent = function(cache) {
        if(current) {
            return current;
        }
    };

    load()

    return {
        refresh: load,
        add: add,
        remove: remove,
        list: list,
        nameById: nameById,
        setCurrent: setCurrent,
        getCurrent: getCurrent
    };
}).

service('MapproxyGrids', function($rootScope, MapproxyResource) {
    var _grids = {};
    var current;

    var load = function() {
        MapproxyResource.query({action: 'grids'}, function(result) {
            angular.forEach(result, function(item) {
                _grids[item._id] = item;
            });
            $rootScope.$broadcast('mapproxy_grids.load_complete');
        });
    };
    var add = function(grid) {
        var grid = new MapproxyResource(grid);
        if(angular.isUndefined(grid._id)) {
            grid.$save({action: 'grids'}, function(result) {
                _grids[result._id] = result;
                $rootScope.$broadcast('mapproxy_grids.added');
            });
        } else {
            grid.$update({action: 'grids', id: grid._id}, function(result) {
                _grids[result._id] = result;
                $rootScope.$broadcast('mapproxy_grids.updated');
            });
        }
    };
    var remove = function(grid) {
        grid.$delete({action: 'grids', id: grid._id}, function(result) {
            delete(_grids[result._id]);
            $rootScope.$broadcast('mapproxy_grids.deleted');
        });
    };
    var list = function() {
        return dict2list(_grids);
    };
    var setCurrent = function(grid, copy) {
        if(copy) {
            current = angular.copy(grid);
        } else {
            current = grid;
        }
        $rootScope.$broadcast('mapproxy_grids.current');
    };

    var getCurrent = function(grid) {
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
}).

service('MapproxyLayers', function($rootScope, MapproxyResource) {
    var _layers = {};
    var current;

    var load = function() {
        //can't use query. resource returns no array.
        MapproxyResource.get({action: 'layers'}, function(result) {
            angular.forEach(result['tree'], function(item) {
                _layers[item._id] = item;
            });
            $rootScope.$broadcast('mapproxy_layers.load_complete');
        });
    };
    var add = function(layer) {
        var layer = new MapproxyResource(layer);
        if(angular.isUndefined(layer._id)) {
            layer.$save({action: 'layers'}, function(result) {
                _layers[result._id] = result;
                $rootScope.$broadcast('mapproxy_layers.added');
            });
        } else {
            layer.$update({action: 'layers', id: layer._id}, function(result) {
                _layers[result._id] = result;
                $rootScope.$broadcast('mapproxy_layers.updated');
            });
        }
    };
    var remove = function(layer) {
        layer.$delete({action: 'layers', id: layer._id}, function(result) {
            delete(_layers[result._id]);
            $rootScope.$broadcast('mapproxy_layers.deleted');
        });
    };

    var list = function() {
        return dict2list(_layers);
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

    var updateTree = function() {
        //to implement
        angular.noop();
    }

    load();

    return {
        refresh: load,
        add: add,
        list: list,
        setCurrent: setCurrent,
        getCurrent: getCurrent,
        updateTree: updateTree
    };
});
