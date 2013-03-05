function TreeCtrl($scope, WMSSources) {

    var refreshTree = function() {
        $scope.wms_list = WMSSources.list();
    };
    $scope.itemData = function(layer) {
        if(!layer.name) {
            return layer.layers;
        }
        return layer;
    };
    $scope.addCapabilities = function(url) {
        WMSSources.add({url: url});
    };

    $scope.$on('wms_capabilities.load_complete', refreshTree);
    $scope.$on('wms_capabilities.added', refreshTree);
}

function MapproxySourceListCtrl($scope, MapproxySources) {

    var refreshList = function() {
        $scope.mapproxy_sources = MapproxySources.list();
    }

    $scope.editSource = function(source) {
        MapproxySources.setCurrent(source, true);
    };
    $scope.removeSource = function(source) {
        MapproxySources.remove(source);
    };

    $scope.$on('sources.load_complete', refreshList);
    $scope.$on('sources.added', refreshList);
    $scope.$on('sources.updated', refreshList);
    $scope.$on('sources.deleted', refreshList);
}

function MapproxySourceFormCtrl($scope, MapproxySources, WMSSources) {
    $scope.openDialog = function(callback, new_data) {
        if(angular.isUndefined($scope.source.req) ||
           angular.isUndefined($scope.source.req.url) ||
           angular.isUndefined($scope.source.req.layers) ||
           $scope.source.req.layers.length == 0) {
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
                        $scope.source.req.layers = undefined;
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
        $scope.source = clearData($scope.source)
        MapproxySources.add($scope.source);
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.source = {'type': 'wms'};
        $scope.source_form.$setPristine();
        MapproxySources.setCurrent($scope.source, false)
    };
    $scope.addLayerManual = function(event) {
        event.preventDefault();
        var new_layer = $scope.custom.layer_manual;
        if(!angular.isArray($scope.source.req.layers)) {
            $scope.source.req.layers = [new_layer];
        } else {
            $scope.source.req.layers.push(new_layer);
        }
        $scope.custom.layer_manual = undefined;
    };
    $scope.layerTitle = function(layer) {
        return WMSSources.layerTitle($scope.source.req.url, layer);
    };

    //must defined here if this controller should own all subelements of custom/source
    $scope.custom = {};
    $scope.source = {'type': 'wms'};

    MapproxySources.setCurrent($scope.source, false)

    $scope.$on('sources.current', function() {
        $scope.source = MapproxySources.getCurrent();
    });
}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {

    var refreshList = function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    }

    $scope.editCache = function(cache) {
        MapproxyCaches.setCurrent(cache, true);
    };
    $scope.removeCache = function(cache) {
        MapproxyCaches.remove(cache);
    };

    $scope.$on('caches.load_complete', refreshList);
    $scope.$on('caches.added', refreshList);
    $scope.$on('caches.updated', refreshList);
    $scope.$on('caches.deleted', refreshList);
}

function MapproxyCacheFormCtrl($scope, MapproxySources, MapproxyCaches, MapproxyGrids) {

    var refreshGrids = function() {
        $scope.available_grids = MapproxyGrids.list();
    };

    $scope.addCache = function(event) {
        event.preventDefault();
        $scope.cache = clearData($scope.cache);
        MapproxyCaches.add($scope.cache);
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.cache = {'meta_size': [null, null]};
        $scope.cache_form.$setPristine();
        MapproxyCaches.setCurrent($scope.cache, false);
    };
    $scope.showName = function(_id) {
        return MapproxySources.byId(_id).name;
    };

    $scope.cache = {'meta_size': [null, null]};
    MapproxyCaches.setCurrent($scope.cache, false);

    $scope.$on('caches.current', function() {
        $scope.cache = MapproxyCaches.getCurrent();
        if(angular.isUndefined($scope.cache.meta_size)) {
            $scope.cache.meta_size = [null, null];
        }
    });

    $scope.$on('grids.load_complete', refreshGrids);
    $scope.$on('grids.added', refreshGrids);
    $scope.$on('grids.updated', refreshGrids);
    $scope.$on('grids.deleted', refreshGrids);

}

function MapproxyGridListCtrl($scope, MapproxyGrids) {

    var refreshList = function() {
        $scope.mapproxy_grids = MapproxyGrids.list();
    };

    $scope.editGrid = function(grid) {
        MapproxyGrids.setCurrent(grid, true);
    };
    $scope.removeGrid = function(grid) {
        MapproxyCaches.remove(grid);
    };

    $scope.$on('grids.load_complete', refreshList);
    $scope.$on('grids.added', refreshList);
    $scope.$on('grids.updated', refreshList);
    $scope.$on('grids.deleted', refreshList);
}

function MapproxyGridFormCtrl($scope, MapproxyGrids) {

    $scope.addGrid = function(event) {
        event.preventDefault();
        MapproxyGrids.add(clearData($scope.grid));
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid = {'bbox': [null, null, null, null]};
        $scope.grid_form.$setPristine();
        MapproxyGrids.setCurrent($scope.grid, false);
    };

    $scope.grid = {'bbox': [null, null, null, null]};
    MapproxyGrids.setCurrent($scope.grid, false);

    $scope.$on('grids.current', function() {
        $scope.grid = MapproxyGrids.getCurrent();
        if(angular.isUndefined($scope.grid.bbox)) {
            $scope.grid.bbox = [null, null, null, null];
        }
    });
}

function MapproxyLayerListCtrl($scope, MapproxyLayers) {

    var refreshTree = function() {
        $scope.mapproxy_layers = MapproxyLayers.tree();
    }

    $scope.editLayer = function(layer) {
        MapproxyLayers.setCurrent(layer, true);
    };
    $scope.removeLayer = function(layer) {
        $scope.mapproxy_layers.splice($scope.mapproxy_layers.indexOf(layer), 1);
        $scope.$apply();
    };
    $scope.updateLayerTree = function() {
        MapproxyLayers.updateTree();
    }

    $scope.$on('layers.load_complete', refreshTree);
    $scope.$on('layers.added', refreshTree);
    $scope.$on('layers.updated', MapproxyLayers.refresh);
    $scope.$on('layers.deleted', refreshTree);
}

function MapproxyLayerFormCtrl($scope, MapproxySources, MapproxyCaches, MapproxyLayers) {

    $scope.addLayer = function() {
        $scope.layer = clearData($scope.layer)
        MapproxyLayers.add(angular.copy($scope.layer));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.layer = {};
        $scope.layer_form.$setPristine();
        MapproxyLayers.setCurrent($scope.layer, false);
    };
    $scope.layerTitle = function(name) {
        var layer = MapproxyLayers.byName(name);
        if(angular.isDefined(layer)) {
            return layer.title;
        }
    };
    $scope.showName = function(_id) {
        return MapproxySources.byId(_id) ? MapproxySources.byId(_id).name : MapproxyCaches.byId(_id).name;
    };


    $scope.layer = {};
    MapproxyLayers.setCurrent($scope.layer, false);

    $scope.$on('layers.current', function() {
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

    $scope.$on('sources.current', function() {
        $scope.watch_source = MapproxySources.getCurrent();
    });
}

function MapproxyConfigCtrl($scope, $http) {

    $scope.mapproxy_yaml = undefined;

    $scope.getConfig = function() {
        $http.get('/conf/base/yaml').success(function(result) {
            $scope.mapproxy_yaml = result;
        });
    };
}