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
    $scope.addCapabilities = function() {
        $scope.capabilities.error = false;
        WMSSources.add({url: $scope.capabilities.url});
    };
    $scope.refreshCapabilities = function(event, wms) {
        event.stopPropagation();
        WMSSources.refresh(wms);
    };
    $scope.removeCapabilities = function(event, wms) {
        event.stopPropagation();
        WMSSources.remove(wms);
    };

    $scope.$on('wms_capabilities.load_complete', refreshTree);
    $scope.$on('wms_capabilities.deleted', refreshTree);
    $scope.$on('wms_capabilities.added', function() {
        $('#capabilities_add_ok').show().fadeOut(3000);
        refreshTree();
    });
    $scope.$on('wms_capabilities.updated', function() {
        $scope.refresh_msg = WMSSources.last().title + ' refreshed';
        refreshTree();
        $('#capabilities_refresh_ok').show().fadeOut(3000);
    });
    $scope.$on('wms_capabilities.error', function() {
        $scope.capabilities.error = WMSSources.error();
    });
    $scope.capabilities = {};
    $scope.capabilities.error = false;

}

function MapproxySourceListCtrl($scope, MapproxySources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}};
    var refreshList = function() {
        $scope.mapproxy_sources = MapproxySources.list();
    }

    $scope.editSource = function(source) {
        MapproxySources.current(source);
    };
    $scope.removeSource = function(source) {
        MapproxySources.remove(source);
    };
    $scope.newSource = function() {
        MapproxySources.current(DEFAULT_SOURCE);
    };

    $scope.$on('sources.load_complete', refreshList);
    $scope.$on('sources.added', refreshList);
    $scope.$on('sources.updated', refreshList);
    $scope.$on('sources.deleted', refreshList);
}

function MapproxySourceFormCtrl($scope, MapproxySources, WMSSources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}};
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
        $scope.source = MapproxySources.current();
        // $scope.source_form.$setPristine();
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
    $scope.source = angular.copy(DEFAULT_SOURCE);
    $scope.formTitle = 'New Source';

    MapproxySources.current($scope.source)

    $scope.$on('sources.current', function() {
        $scope.source = MapproxySources.current();
        $scope.formTitle = angular.equals($scope.source, DEFAULT_SOURCE) ? 'New Source' : 'Edit Source';
    });
    $scope.$on('sources.added', function() {
        MapproxySources.current(DEFAULT_SOURCE)
        $scope.formTitle = 'New Source';
        $('#source_save_ok').show().fadeOut(3000)
    });
    $scope.$on('sources.updated', function() {
        MapproxySources.current(DEFAULT_SOURCE)
        $scope.formTitle = 'New Source';
        $('#source_save_ok').show().fadeOut(3000)
    });
}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
    var refreshList = function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    }

    $scope.editCache = function(cache) {
        MapproxyCaches.current(cache);
    };
    $scope.removeCache = function(cache) {
        MapproxyCaches.remove(cache);
    };
    $scope.newCache = function() {
        MapproxyCaches.current(DEFAULT_CACHE);
    }

    $scope.$on('caches.load_complete', refreshList);
    $scope.$on('caches.added', refreshList);
    $scope.$on('caches.updated', refreshList);
    $scope.$on('caches.deleted', refreshList);
}

function MapproxyCacheFormCtrl($scope, MapproxySources, MapproxyCaches, MapproxyGrids) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
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
        $scope.cache = MapproxyCaches.current();
    };
    $scope.showName = function(_id) {
        return MapproxySources.byId(_id).name;
    };

    $scope.cache = angular.copy(DEFAULT_CACHE);
    $scope.formTitle = 'New Cache';
    MapproxyCaches.current($scope.cache);

    $scope.$on('caches.current', function() {
        $scope.cache = MapproxyCaches.current();
        if(angular.isUndefined($scope.cache.meta_size)) {
            $scope.cache.meta_size = [null, null];
        }
        $scope.formTitle = angular.equals($scope.cache, DEFAULT_CACHE) ? 'New Cache' : 'Edit Cache';
    });
    $scope.$on('caches.added', function() {
        MapproxyCaches.current(DEFAULT_CACHE);
        $scope.formTitle = 'New Cache';
        $('#cache_save_ok').show().fadeOut(3000)
    });
    $scope.$on('caches.updated', function() {
        MapproxyCaches.current(DEFAULT_CACHE);
        $scope.formTitle = 'New Cache';
        $('#cache_save_ok').show().fadeOut(3000)
    })

    $scope.$on('grids.load_complete', refreshGrids);
    $scope.$on('grids.added', refreshGrids);
    $scope.$on('grids.updated', refreshGrids);
    $scope.$on('grids.deleted', refreshGrids);

}

function MapproxyGridListCtrl($scope, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    var refreshList = function() {
        $scope.mapproxy_grids = MapproxyGrids.list();
    };

    $scope.editGrid = function(grid) {
        MapproxyGrids.current(grid);
    };
    $scope.removeGrid = function(grid) {
        MapproxyGrids.remove(grid);
    };
    $scope.newGrid = function() {
        MapproxyGrids.current(DEFAULT_GRID);
    };

    $scope.$on('grids.load_complete', refreshList);
    $scope.$on('grids.added', refreshList);
    $scope.$on('grids.updated', refreshList);
    $scope.$on('grids.deleted', refreshList);
}

function MapproxyGridFormCtrl($scope, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    $scope.addGrid = function(event) {
        event.preventDefault();
        MapproxyGrids.add(clearData($scope.grid));
        $scope.resetForm();
    };
    $scope.resetForm = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid = MapproxyGrids.current();

    };

    $scope.grid = angular.copy(DEFAULT_GRID);
    $scope.formTitle = 'New Grid'
    MapproxyGrids.current($scope.grid);

    $scope.$on('grids.current', function() {
        $scope.grid = MapproxyGrids.current();
        if(angular.isUndefined($scope.grid.bbox)) {
            $scope.grid.bbox = [null, null, null, null];
        }
        $scope.formTitle = angular.equals($scope.grid, DEFAULT_GRID) ? 'New Grid' : 'Edit Grid';
    });
    $scope.$on('grids.added', function() {
        MapproxyGrids.current(DEFAULT_GRID)
        $scope.formTitle = 'New Grid';
        $('#grid_save_ok').show().fadeOut(3000)
    });
    $scope.$on('grids.updated', function() {
        MapproxyGrids.current(DEFAULT_GRID)
        $scope.formTitle = 'New Grid';
        $('#grid_save_ok').show().fadeOut(3000)
    })
}

function MapproxyLayerListCtrl($scope, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    var refreshTree = function() {
        $scope.mapproxy_layers = MapproxyLayers.tree();
    };
    var added = function() {
        $scope.mapproxy_layers.push(MapproxyLayers.last());
    };
    $scope.editLayer = function(layer) {
        MapproxyLayers.current(layer);
    };
    $scope.removeLayer = function(layer) {
        MapproxyLayers.remove(layer);
    };
    $scope.updateLayerTree = function() {
        MapproxyLayers.updateStructure($scope.mapproxy_layers);
    };
    $scope.newLayer = function() {
        MapproxyLayers.current(DEFAULT_LAYER)
    }

    $scope.$on('layers.load_complete', refreshTree);
    $scope.$on('layers.added', added);
    $scope.$on('layers.updated', refreshTree);
    $scope.$on('layers.deleted', MapproxyLayers.refresh);
    $scope.$on('layers.updatedStructure', function() {
        $('#layertree_save_ok').show().fadeOut(3000);
    })
}

function MapproxyLayerFormCtrl($scope, MapproxySources, MapproxyCaches, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    $scope.addLayer = function() {
        $scope.layer = clearData($scope.layer)
        MapproxyLayers.add(angular.copy($scope.layer));
        $scope.resetForm();
    };
    $scope.resetForm = function() {
        $scope.layer = MapproxyLayers.current();
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


    $scope.layer = angular.copy(DEFAULT_LAYER);
    MapproxyLayers.current($scope.layer);
    $scope.formTitle = 'New Layer';

    $scope.$on('layers.current', function() {
        $scope.layer = MapproxyLayers.current();
        $scope.formTitle = angular.equals($scope.layer, DEFAULT_LAYER) ? 'New Layer' : 'Edit Layer';
    });
    $scope.$on('layers.added', function() {
        MapproxyLayers.current(DEFAULT_LAYER)
        $scope.formTitle = 'New Layer';
        $('#layer_save_ok').show().fadeOut(3000)
    });
    $scope.$on('layers.updated', function() {
        MapproxyLayers.current(DEFAULT_LAYER)
        $scope.formTitle = 'New Layer';
        $('#layer_save_ok').show().fadeOut(3000)
    });

}

function MapproxyGlobalsFormCtrl($scope, MapproxyGlobals) {
    var setGlobals = function() {
        var globals = MapproxyGlobals.list();
        if(globals.length > 0) {
            $scope.globals = globals[0];
        }
    };

    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        MapproxyGlobals.add($scope.globals);
    };

    $scope.globals = {'cache': {'meta_size': [null, null]}};

    $scope.$on('globals.load_complete', setGlobals);
    $scope.$on('globals.added', setGlobals);
};

function MapproxyServicesChooserCtrl($scope, DataShareService) {
    $scope.show = function(service) {
        DataShareService.data('service', service + '.html')
    };
    $scope.$on('dss.services', function() {
        $scope.services = DataShareService.data('services');
    });
};

function MapproxyServicesCtrl($scope, MapproxyServices, DataShareService) {
    var setServices = function() {
        var services = MapproxyServices.list();
        if(services.length > 0) {
            $scope.services = services[0];
        }
    };

    var setTemplate = function() {
        $scope.template = DataShareService.data('service');
    }

    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        MapproxyServices.add($scope.services);
    };

    $scope.services = {
        'wms': {},
        'wmts': {},
        'tms': {},
        'kml': {},
        'demo': {}
    };

    DataShareService.data('services', $scope.services);

    $scope.template = 'wms.html'

    $scope.$on('services.load_complete', setServices);
    $scope.$on('services.added', setServices);
    $scope.$on('dss.service', setTemplate)
};

function MapproxySourceNoticeCtrl($scope, MapproxySources) {
    //define all watch results
    $scope.invalid_image_settings = false;
    $scope.high_number_of_concurrent_requests = false;

    var checkImageSettings = function(newVal, oldVal, scope) {
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

    var checkConcurrentRequests = function(newVal, oldVal, scope) {
        if(angular.isDefined($scope.watch_source.concurrent_requests) &&
           $scope.watch_source.concurrent_requests > 4) {
            $scope.high_number_of_concurrent_requests = true;
        } else {
            $scope.high_number_of_concurrent_requests = false;
        }
    }

    $scope.$watch('watch_source.supported_formats', checkImageSettings)
    $scope.$watch('watch_source.req.transparent', checkImageSettings)
    $scope.$watch('watch_source.concurrent_requests', checkConcurrentRequests)

    $scope.$on('sources.current', function() {
        $scope.watch_source = MapproxySources.current();
    });
}

function MapproxyConfigCtrl($scope, $http) {

    $scope.mapproxy_yaml = undefined;

    $http.get('/conf/base/yaml').success(function(result) {
        $scope.mapproxy_yaml = result;
        $scope.yaml_msg = 'Mapproxy YAML written.'
    });
}