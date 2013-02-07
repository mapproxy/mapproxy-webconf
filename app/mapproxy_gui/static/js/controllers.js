function TreeCtrl($scope, $http, $element) {

    $scope.itemData = function(layer) {
        if(!layer.name) {
            return layer.layers;
        }
        return layer;
    };
    $scope.loadData = function(url) {
        //XXX kai: replace with url
        $http.get('/data/get_capabilities.json').success(function(data) {
            if($scope.wms_list) {
                $scope.wms_list = $scope.wms_list.concat(data);
            } else {
                $scope.wms_list = data;
            }
        });
    };

    $http.get('/data/get_capabilities.json').success(function(data) {
        $scope.wms_list = data;
    });
}

function MapproxySourceListCtrl($scope, MapproxySources) {

    $scope.editSource = function(source) {
        MapproxySources.setEditSource(source);
    };

    $scope.mapproxy_sources = MapproxySources.getSourceList();

    $scope.$on('mapproxy_sources_change', function() {
        $scope.mapproxy_sources = MapproxySources.getSourceList();
    });

}

function MapproxySourceFormCtrl($scope, MapproxySources) {

    $scope.openDialog = function(callback, new_data) {
        if(!angular.isUndefined($scope.source.wms_source)) {
            $('#confirm_url_change_dialog').dialog({
                resizeable: false,
                width: 400,
                height: 200,
                model: true,
                buttons: {
                    "Change url": function() {
                        $(this).dialog("close");
                        $scope.source.layers = undefined;
                        $scope.$apply();
                        callback(true);
                    },
                    "Keep url": function() {
                        $(this).dialog("close");
                        callback(false);
                    }
                }
            });
        } else {
            callback(true);
        }
    };
    $scope.addSource = function() {
        MapproxySources.addSource(angular.copy($scope.source.name), angular.copy($scope.source));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.source = {};
        $scope.source_form.$setPristine();
    };

    $scope.source = {};

    $scope.$on('edit_source_event', function() {
        $scope.source = angular.copy(MapproxySources.getEditSource());
    });
}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {

    $scope.editCache = function(cache) {
        MapproxyCaches.setEditCache(cache);
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
