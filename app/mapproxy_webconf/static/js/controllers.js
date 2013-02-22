function TreeCtrl($scope, WMSSources) {

    $scope.itemData = function(layer) {
        if(!layer.name) {
            return layer.layers;
        }
        return layer;
    };
    $scope.loadData = function(url) {
        WMSSources.loadData('/conf/base/wms_capabilities');
    };

    $scope.$on('wms_list_refreshed', function() {
        $scope.wms_list = WMSSources.wmsList();
    });

    WMSSources.loadData('/conf/base/wms_capabilities');
}

function MapproxySourceListCtrl($scope, MapproxySources) {

    $scope.editSource = function(source) {
        MapproxySources.setCurrent(source, true);
    };
    $scope.removeSource = function(source) {
        $scope.mapproxy_sources.splice($scope.mapproxy_sources.indexOf(source), 1);
        $scope.$apply();
    };

    $scope.mapproxy_sources = MapproxySources.list();

    $scope.$on('mapproxy_sources.list', function() {
        $scope.mapproxy_sources = MapproxySources.list();
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
        MapproxySources.add(angular.copy($scope.source.name), angular.copy($scope.source));
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.source = {};
        $scope.source_form.$setPristine();
        MapproxySources.setCurrent($scope.source, false)
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

    MapproxySources.setCurrent($scope.source, false)

    $scope.$on('mapproxy_sources.current', function() {
        $scope.source = MapproxySources.getCurrent();
    });
}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {

    $scope.editCache = function(cache) {
        MapproxyCaches.setCurrent(cache, true);
    };
    $scope.removeCache = function(cache) {
        $scope.mapproxy_caches.splice($scope.mapproxy_caches.indexOf(cache), 1);
        $scope.$apply();
    };

    $scope.mapproxy_caches = MapproxyCaches.list();

    $scope.$on('mapproxy_caches.list', function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    });
}

function MapproxyCacheFormCtrl($scope, MapproxyCaches) {

    $scope.addCache = function() {
        MapproxyCaches.add(angular.copy($scope.cache.name), angular.copy($scope.cache));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.cache = {};
        $scope.cache_form.$setPristine();
        MapproxyCaches.setCurrent($scope.cache, false);
    };

    $scope.cache = {};
    MapproxyCaches.setCurrent($scope.cache, false);

    $scope.$on('mapproxy_caches.current', function() {
        $scope.cache = MapproxyCaches.getCurrent();
    });

}

function MapproxyLayerListCtrl($scope, MapproxyLayers) {

    $scope.editLayer = function(layer) {
        MapproxyLayers.setCurrent(layer, true);
    };
    $scope.removeLayer = function(layer) {
        $scope.mapproxy_layers.splice($scope.mapproxy_layers.indexOf(layer), 1);
        $scope.$apply();
    };

    $scope.mapproxy_layers = MapproxyLayers.list();

    $scope.$on('mapproxy_layers.list', function() {
        $scope.mapproxy_layers = MapproxyLayers.list();
    });
}

function MapproxyLayerFormCtrl($scope, MapproxyLayers) {

    $scope.addLayer = function() {
        MapproxyLayers.add(angular.copy($scope.layer.name), angular.copy($scope.layer));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.layer = {};
        $scope.layer_form.$setPristine();
        MapproxyLayers.setCurrent($scope.layer, false);
    };

    $scope.layer = {};
    MapproxyLayers.setCurrent($scope.layer, false);

    $scope.$on('mapproxy_layers.current', function() {
        $scope.layer = MapproxyLayers.getCurrent();
    });

}

function MapproxySourceNoticeCtrl($scope, MapproxySources) {
    //define all watch results
    $scope.invalid_image_settings = false;
    $scope.high_number_of_concurrent_requests = false;
    var checkImageSettings = function() {
        //ensure all variables to check for are defined!
        if(angular.isDefined($scope.watch_source.req) &&
           angular.isDefined($scope.watch_source.supported_formats) &&
           $scope.watch_source.req.transparent == true) {
            var found = false;
            var non_transparent_formats = ['JPEG', 'GIF'];
            angular.forEach($scope.watch_source.supported_formats, function(format) {
                if (!found) {
                    found = -1 != non_transparent_formats.indexOf(format);
                }
                $scope.invalid_image_settings = found;
            })
        } else {
            $scope.invalid_image_settings = false;
        }
    };

    var checkConcurrentRequests = function() {
        if(angular.isDefined($scope.watch_source.concurrent_requests) &&
           $scope.watch_source.concurrent_requests > 4) {
            $scope.high_number_of_concurrent_requests = true;
        } else {
            $scope.high_number_of_concurrent_requests = false;
        }
    }



    $scope.$watch('watch_source', function(newVal, oldVal, scope) {
        checkImageSettings();
        checkConcurrentRequests();
    }, true);

    $scope.$on('mapproxy_sources.current', function() {
        $scope.watch_source = MapproxySources.getCurrent();
    });
}
