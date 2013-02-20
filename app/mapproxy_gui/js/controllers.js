function TreeCtrl($scope, WMSSources) {

    $scope.itemData = function(layer) {
        if(!layer.name) {
            return layer.layers;
        }
        return layer;
    };
    $scope.loadData = function(url) {
        WMSSources.loadData('data/get_capabilities.json');
    };

    $scope.$on('wms_list_refreshed', function() {
        $scope.wms_list = WMSSources.wms_list();
    });

    WMSSources.loadData('data/get_capabilities.json');
}

function MapproxySourceListCtrl($scope, MapproxySources) {

    $scope.editSource = function(source) {
        MapproxySources.setEditSource(source, true);
    };
    $scope.removeSource = function(source) {
        $scope.mapproxy_sources.splice($scope.mapproxy_sources.indexOf(source), 1);
        $scope.$apply();
    };

    $scope.mapproxy_sources = MapproxySources.getSourceList();

    $scope.$on('mapproxy_sources_change', function() {
        $scope.mapproxy_sources = MapproxySources.getSourceList();
    });

}

function MapproxySourceFormCtrl($scope, MapproxySources, WMSSources) {

    $scope.openDialog = function(callback, new_data) {
        if(angular.isUndefined($scope.source.req) ||
           angular.isUndefined($scope.source.req.url) ||
           angular.isUndefined($scope.source.req.layer) ||
           $scope.source.req.layer.length == 0) {
            callback(true);
        } else  {
            $('#confirm_url_change_dialog').dialog({
                resizeable: false,
                width: 400,
                height: 200,
                model: true,
                buttons: {
                    "Change url": function() {
                        $(this).dialog("close");
                        $scope.source.req.layer = undefined;
                        $scope.$apply();
                        callback(true);
                    },
                    "Keep url": function() {
                        $(this).dialog("close");
                        callback(false);
                    }
                }
            });
        }
    };
    $scope.addSource = function(event) {
        event.preventDefault();
        MapproxySources.addSource(angular.copy($scope.source.name), angular.copy($scope.source));
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.source = {};
        $scope.source_form.$setPristine();
        MapproxySources.setEditSource($scope.source, false)
    };
    $scope.addLayerManual = function(event) {
        event.preventDefault();
        var new_layer = $scope.custom.layer_manual;
        if(!angular.isArray($scope.source.req.layer)) {
            $scope.source.req.layer = [new_layer];
        } else {
            $scope.source.req.layer.push(new_layer);
        }
        $scope.custom.layer_manual = undefined;
    };
    $scope.layerTitle = function(layer) {
        return WMSSources.layerTitle($scope.source.req.url, layer);
    };

    //must defined here if this controller should own all subelements of custom/source
    $scope.custom = {};
    $scope.source = {};

    MapproxySources.setEditSource($scope.source, false)

    $scope.$on('edit_source_event', function() {
        $scope.source = MapproxySources.getEditSource();
    });
}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {

    $scope.editCache = function(cache) {
        MapproxyCaches.setEditCache(cache);
    };
    $scope.removeCache = function(cache) {
        $scope.mapproxy_caches.splice($scope.mapproxy_caches.indexOf(cache), 1);
        $scope.$apply();
    };

    $scope.mapproxy_caches = MapproxyCaches.getCacheList();

    $scope.$on('mapproxy_caches_change', function() {
        $scope.mapproxy_caches = MapproxyCaches.getCacheList();
    });
}

function MapproxyCacheFormCtrl($scope, MapproxyCaches) {

    $scope.addCache = function() {
        MapproxyCaches.addCache(angular.copy($scope.cache.name), angular.copy($scope.cache));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.cache = {};
        $scope.cache_form.$setPristine();
    };

    $scope.cache = {};

    $scope.$on('edit_cache_event', function() {
        $scope.cache = MapproxyCaches.getEditCache();
    });

}

function MapproxyLayerListCtrl($scope, MapproxyLayers) {

    $scope.editLayer = function(layer) {
        MapproxyLayers.setEditLayer(layer);
    };
    $scope.removeLayer = function(layer) {
        $scope.mapproxy_layers.splice($scope.mapproxy_layers.indexOf(layer), 1);
        $scope.$apply();
    };

    $scope.mapproxy_layers = MapproxyLayers.getLayerList();

    $scope.$on('mapproxy_layers_change', function() {
        $scope.mapproxy_layers = MapproxyLayers.getLayerList();
    });
}

function MapproxyLayerFormCtrl($scope, MapproxyLayers) {

    $scope.addLayer = function() {
        MapproxyLayers.addLayer(angular.copy($scope.layer.name), angular.copy($scope.layer));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.layer = {};
        $scope.layer_form.$setPristine();
    };

    $scope.layer = {};

    $scope.$on('edit_layer_event', function() {
        $scope.layer = MapproxyLayers.getEditLayer();
    });

}
