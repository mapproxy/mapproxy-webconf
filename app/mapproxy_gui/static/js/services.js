angular.module('mapproxy_gui.services', []).

service('MapproxySources', function($rootScope) {
    var sources = {};
    var edit_source;
    return {
        addSource: function(name, value) {
            sources[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_sources_change');
        },
        getSourceByName: function(name) {
            return sources[name];
        },
        getSourceList: function() {
            var result = [];
            for(var key in sources) {
                result.push(sources[key]);
            }
            return result;
        },
        setEditSource: function(source) {
            edit_source = source;
            $rootScope.$broadcast('edit_source_event');
        },
        getEditSource: function(source) {
            if(edit_source) {
                return edit_source;
            }
        }
    };
}).

service('MapproxyCaches', function($rootScope) {
    var caches = {};
    var edit_cache;
    return {
        addCache: function(name, value) {
            caches[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_caches_change');
        },
        getCacheByName: function(name) {
            return caches[name];
        },
        getCacheList: function() {
            var result = [];
            for(var key in caches) {
                result.push(caches[key]);
            }
            return result;
        },
        setEditCache: function(cache) {
            edit_cache = cache;
            $rootScope.$broadcast('edit_cache_event');
        },
        getEditCache: function(cache) {
            if(edit_cache) {
                return edit_cache;
            }
        }
    };
}).

service('MapproxyLayers', function($rootScope) {
    var layers = {};
    var edit_layer;
    return {
        addLayer: function(name, value) {
            layers[name] = value;
            //trigger event in rootScope, so all scope notive about
            $rootScope.$broadcast('mapproxy_layers_change');
        },
        getLayerByName: function(name) {
            return layers[name];
        },
        getLayerList: function() {
            var result = [];
            for(var key in layers) {
                result.push(layers[key]);
            }
            return result;
        },
        setEditLayer: function(layer) {
            edit_layer = layer;
            $rootScope.$broadcast('edit_layer_event');
        },
        getEditLayer: function(layer) {
            if(edit_layer) {
                return edit_layer;
            }
        }
    };
});
