angular.module('mapproxy_gui.services', ['mapproxy_gui.resources']).

service('WMSSources', function($rootScope, $http) {
    var wms_list = undefined;
    return {
        loadData: function(url) {
            //XXX kai: replace with url
            $http.get(url).success(function(data) {
                if(wms_list) {
                    wms_list = wms_list.concat(data);
                } else {
                    wms_list = data;
                }
                $rootScope.$broadcast('wms_list_refreshed');
            });
        },
        layerTitle: function(url, layer_name) {
            var title = false
            angular.forEach(wms_list, function(wms) {
                if(wms.url == url) {
                    angular.forEach(wms.layers, function(layer) {
                        if(layer.name == layer_name) {
                            title = layer.title;
                        }
                    });
                }
            });
            return title;
        },
        wms_list: function() {
            return wms_list;
        }
    };
}).

service('MapproxySources', function($rootScope) {
    var sources = {};
    var current;
    return {
        add: function(name, value) {
            sources[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_sources.list');
        },
        byName: function(name) {
            return sources[name];
        },
        list: function() {
            var result = [];
            for(var key in sources) {
                result.push(sources[key]);
            }
            return result;
        },
        setCurrent: function(source, copy) {
            if(copy) {
                current = angular.copy(source);
            } else {
                current = source;
            }
            $rootScope.$broadcast('mapproxy_sources.current');
        },
        getCurrent: function() {
            if(current) {
                return current;
            }
        }
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

service('MapproxyLayers', function($rootScope) {
    var layers = {};
    var current;
    return {
        add: function(name, value) {
            layers[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_layers.list');
        },
        byName: function(name) {
            return layers[name];
        },
        list: function() {
            var result = [];
            for(var key in layers) {
                result.push(layers[key]);
            }
            return result;
        },
        setCurrent: function(layer, copy) {
            if(copy) {
                current = angular.copy(layer);
            } else {
                current = layer;
            }
            $rootScope.$broadcast('mapproxy_layers.current');
        },
        getCurrent: function(layer) {
            if(current) {
                return current;
            }
        }
    };
});
