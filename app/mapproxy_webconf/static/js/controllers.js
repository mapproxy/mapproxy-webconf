var PAGE_LEAVE_MSG = "You have unsaved changes in this form. Realy leave the page and disgard unsaved changes?";

function TreeCtrl($scope, localize, WMSSources) {

    var refreshTree = function() {
        $scope.wms_list = WMSSources.list();
        $scope.wms_urls = WMSSources.allURLs();
    };
    $scope.prepareLayer = function(layer, sourceURL) {
        if(!layer.name) {
            $.each(layer.layers, function(idx, layer) {
                layer.sourceURL = sourceURL;
            });
            return layer.layers;
        }
        layer.sourceURL = sourceURL;
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
    $scope.removeCapabilities = function(wms) {
        WMSSources.remove(wms);
    };

    $scope.$on('wms_capabilities.load_complete', refreshTree);
    $scope.$on('wms_capabilities.deleted', refreshTree);
    $scope.$on('wms_capabilities.added', function() {
        $('#capabilities_add_ok').show().fadeOut(3000);
        refreshTree();
    });
    $scope.$on('wms_capabilities.updated', function() {
        $scope.refresh_msg = WMSSources.last().title + ' ' + localize.getLocalizedString('refreshed');
        refreshTree();
        $('#capabilities_refresh_ok').show().fadeOut(3000);
    });
    $scope.$on('wms_capabilities.error', function() {
        $scope.capabilities.error = WMSSources.error();
    });
    $scope.capabilities = {};
    $scope.capabilities.error = false;

}

function MapproxySourceListCtrl($scope, localize, MapproxySources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}};
    var refreshList = function() {
        $scope.mapproxy_sources = MapproxySources.list();
    };
    $scope.isSelected = function(source) {
        var class_;
        if($scope.selected == source) {
            class_ = 'selected';
        }
        return class_;
    };
    $scope.editSource = function(source) {
        $scope.selected = source
        MapproxySources.current(true, source);
    };
    $scope.removeSource = function(source) {
        $scope.selected = undefined;
        MapproxySources.remove(source);
    };
    $scope.newSource = function() {
        $scope.selected = undefined;
        MapproxySources.current(true, DEFAULT_SOURCE);
    };
    $scope.hasDependencies = function(source) {
        var hasDependencies = false;
        angular.forEach(source.dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(source) {
        var result = '';
        angular.forEach(source.dependencies, function(dependencies, name) {
            if(dependencies.length > 0) {
                result += name +'<br>';
                angular.forEach(dependencies, function(dependency) {
                    result += '&nbsp;&nbsp;' + dependency.name + '<br>';
                });
            }
        });
        return result;
    };

    $scope.$on('sources.load_complete', refreshList);
    $scope.$on('sources.added', function() {
        $('#source_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('sources.updated', function() {
        $('#source_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('sources.deleted', refreshList);
}

function MapproxySourceFormCtrl($scope, localize, MapproxySources, WMSSources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}};

    $scope.openDialog = function(callback, new_data) {
        if(angular.isUndefined($scope.source.req) ||
           angular.isUndefined($scope.source.req.url) ||
           angular.isUndefined($scope.source.req.layers) ||
           $scope.source.req.layers.length == 0) {
            callback(true);
        } else  {
            var buttons = {};
            buttons[localize.getLocalizedString('Change URL')] = function() {
                $(this).dialog("close");
                $scope.source.req.layers = undefined;
                $scope.$apply();
                callback(true);
            };
            buttons[localize.getLocalizedString('Keep URL')] = function() {
                $(this).dialog("close");
                callback(false);
            };

            $('#confirm_url_change_dialog').dialog({
                resizeable: false,
                width: 400,
                height: 200,
                model: true,
                buttons: buttons
            });
        }
    };
    $scope.checkURL = function(callback, new_data) {
        var addLayer = false;
        var urlReplaceAsk = false;
        if(angular.isUndefined($scope.source.req.url)) {
            $scope.source.req.url = new_data.sourceURL;
            addLayer = true;
        } else {
            if(angular.equals($scope.source.req.url, new_data.sourceURL)) {
                addLayer = true;
            } else {
                urlReplaceAsk = true;
            }
        }
        if(urlReplaceAsk) {
            $('#confirm_url_change_dialog').dialog({
                resizeable: false,
                width: 400,
                height: 200,
                model: true,
                buttons: {
                    "Change url and insert layer": function() {
                        $(this).dialog("close");
                        $scope.source.req.url = new_data.sourceURL;
                        $scope.source.req.layers = undefined;
                        $scope.$apply();
                        callback(true);
                    },
                    "Keep url and reject layer": function() {
                        $(this).dialog("close");
                        callback(false);
                    }
                }
            });
        }
        if(addLayer) {
            callback(true);
        }
    };
    $scope.addSource = function(event) {
        event.preventDefault();
        $scope.source = clearData($scope.source)
        if(angular.isDefined($scope.source._id) || !$scope.exist($scope.source.name)) {
            MapproxySources.add($scope.source);
            $scope.formTitle = 'Edit source';
            $scope.source_form.$setPristine();
        } else {
            $scope.errorMsg = localize.getLocalizedString("Name already exists.");
            $('#source_save_error').show().fadeOut(3000);
        }
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.source = MapproxySources.current(true);
        $scope.source_form.$setPristine();
    };
    $scope.addLayerManual = function(event) {
        event.preventDefault();
        var new_layer = $scope.custom.layer_manual;
        if(angular.isDefined(new_layer)) {
            if(!angular.isArray($scope.source.req.layers)) {
                $scope.source.req.layers = [new_layer];
            } else {
                $scope.source.req.layers.push(new_layer);
            }
            $scope.custom.layer_manual = undefined;
        }
    };
    $scope.exist = function(name) {
        return (MapproxySources.byName(name)) ? true : false;
    };
    $scope.layerTitle = function(layer) {
        return WMSSources.layerTitle($scope.source.req.url, layer);
    };

    //must defined here if this controller should own all subelements of custom/source
    $scope.custom = {};
    $scope.source = angular.copy(DEFAULT_SOURCE);
    $scope.formTitle = 'New source';

    MapproxySources.current(true, $scope.source)

    $scope.$on('sources.current', function() {
        $scope.source = MapproxySources.current(true);
        $scope.formTitle = angular.equals($scope.source, DEFAULT_SOURCE) ? 'New source' : 'Edit source';
        $scope.source_form.$setPristine();
    });

    $(window).on('beforeunload', function() {
        if($scope.source_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });

}

function MapproxyCacheListCtrl($scope, MapproxyCaches) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
    var refreshList = function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    }
    $scope.isSelected = function(cache) {
        var class_;
        if($scope.selected == cache) {
            class_ = 'selected';
        }
        return class_;
    };
    $scope.editCache = function(cache) {
        $scope.selected = cache;
        MapproxyCaches.current(true, cache);
    };
    $scope.removeCache = function(cache) {
        $scope.selected = undefined;
        MapproxyCaches.remove(cache);
    };
    $scope.newCache = function() {
        $scope.selected = undefined;
        MapproxyCaches.current(true, DEFAULT_CACHE);
    }
    $scope.hasDependencies = function(cache) {
        var hasDependencies = false;
        angular.forEach(cache.dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(cache) {
        var result = '';
        angular.forEach(cache.dependencies, function(dependencies, name) {
            if(dependencies.length > 0) {
                result += name +'<br>';
                angular.forEach(dependencies, function(dependency) {
                    result += '&nbsp;&nbsp;' + dependency.name + '<br>';
                });
            }
        });
        return result;
    };

    $scope.$on('caches.load_complete', refreshList);
    $scope.$on('caches.added', function() {
        $('#cache_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('caches.updated', function() {
        $('#cache_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('caches.deleted', refreshList);
}

function MapproxyCacheFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyGrids) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
    var refreshGrids = function() {
        $scope.available_grids = MapproxyGrids.list();
    };

    $scope.addCache = function(event) {
        event.preventDefault();
        $scope.cache = clearData($scope.cache);
        if(angular.isDefined($scope.cache._id) || !$scope.exist($scope.cache.name)) {
            MapproxyCaches.add($scope.cache);
            $scope.formTitle = 'Edit cache';
            $scope.cache_form.$setPristine();
        } else {
            $scope.errorMsg = localize.getLocalizedString("Name already exists.");
            $('#cache_save_error').show().fadeOut(3000);
        }
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        $scope.cache = MapproxyCaches.current(true);
        $scope.cache_form.$setPristine();
    };
    $scope.showName = function(_id) {
        return MapproxySources.byId(_id).name;
    };
    $scope.exist = function(name) {
        return (MapproxyCaches.byName(name)) ? true : false;
    };
    $scope.cache = angular.copy(DEFAULT_CACHE);
    $scope.formTitle = 'New cache';
    MapproxyCaches.current(true, $scope.cache);

    $scope.$on('caches.current', function() {
        $scope.cache = MapproxyCaches.current(true);
        if(angular.isUndefined($scope.cache.meta_size)) {
            $scope.cache.meta_size = [null, null];
        }
        $scope.formTitle = angular.equals($scope.cache, DEFAULT_CACHE) ? 'New cache' : 'Edit cache';
        $scope.cache_form.$setPristine();
    });

    $scope.$on('grids.load_complete', refreshGrids);
    $scope.$on('grids.added', refreshGrids);
    $scope.$on('grids.updated', refreshGrids);
    $scope.$on('grids.deleted', refreshGrids);

    $(window).on('beforeunload', function() {
        if($scope.cache_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });

}

function MapproxyGridListCtrl($scope, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    var refreshList = function() {
        $scope.mapproxy_grids = MapproxyGrids.list();
    };
    $scope.isSelected = function(grid) {
        var class_;
        if($scope.selected == grid) {
            class_ = 'selected';
        }
        return class_;
    };
    $scope.editGrid = function(grid) {
        $scope.selected = grid;
        MapproxyGrids.current(true, grid);
    };
    $scope.removeGrid = function(grid) {
        $scope.selected = undefined;
        MapproxyGrids.remove(grid);
    };
    $scope.newGrid = function() {
        $scope.selected = undefined;
        MapproxyGrids.current(true, DEFAULT_GRID);
    };

    $scope.hasDependencies = function(grid) {
        var hasDependencies = false;
        angular.forEach(grid.dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(grid) {
        var result = '';
        angular.forEach(grid.dependencies, function(dependencies, name) {
            if(dependencies.length > 0) {
                result += name +'<br>';
                angular.forEach(dependencies, function(dependency) {
                    result += '&nbsp;&nbsp;' + dependency.name + '<br>';
                });
            }
        });
        return result;
    };

    $scope.$on('grids.load_complete', refreshList);
    $scope.$on('grids.added', function() {
        $('#grid_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('grids.updated', function() {
        $('#grid_save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('grids.deleted', refreshList);
}

function MapproxyGridFormCtrl($scope, localize, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    $scope.addGrid = function(event) {
        event.preventDefault();
        if(angular.isDefined($scope.grid._id) || !$scope.exist($scope.grid.name)) {
            MapproxyGrids.add(clearData($scope.grid));
            $scope.formTitle = "Edit grid";
            $scope.grid_form.$setPristine();
         } else {
            $scope.errorMsg = localize.getLocalizedString("Name already exists.");
            $('#grid_save_error').show().fadeOut(3000);
        }
    };
    $scope.resetForm = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid = MapproxyGrids.current(true);
        $scope.grid_form.$setPristine();
    };
    $scope.exist = function(name) {
        return (MapproxyGrids.byName(name)) ? true : false;
    };
    $scope.grid = angular.copy(DEFAULT_GRID);
    $scope.formTitle = 'New grid'
    MapproxyGrids.current(true, $scope.grid);

    $scope.$on('grids.current', function() {
        $scope.grid = MapproxyGrids.current(true);
        if(angular.isUndefined($scope.grid.bbox)) {
            $scope.grid.bbox = [null, null, null, null];
        }
        $scope.formTitle = angular.equals($scope.grid, DEFAULT_GRID) ? 'New grid' : 'Edit grid';
        $scope.grid_form.$setPristine();
    });

    $(window).on('beforeunload', function() {
        if($scope.grid_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });

}

function MapproxyLayerListCtrl($scope, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    var refreshTree = function() {
        $scope.mapproxy_layers = MapproxyLayers.tree();
    };
    var added = function() {
        $scope.mapproxy_layers.push(MapproxyLayers.last());
    };
    $scope.isSelected = function(layer) {
        var class_;
        if($scope.selected == layer) {
            class_ = 'selected';
        }
        return class_;
    };
    $scope.editLayer = function(layer) {
        $scope.selected = layer;
        MapproxyLayers.current(true, layer);
    };
    $scope.removeLayer = function(layer) {
        $scope.selected = undefined;
        MapproxyLayers.remove(layer);
    };
    $scope.updateLayerTree = function() {
        $scope.selected = undefined;
        MapproxyLayers.updateStructure($scope.mapproxy_layers);
    };
    $scope.newLayer = function() {
        $scope.selected = undefined;
        MapproxyLayers.current(true, DEFAULT_LAYER)
    };

    $scope.$on('layers.load_complete', refreshTree);
    $scope.$on('layers.added', function() {
        $('#layer_save_ok').show().fadeOut(3000);
        added();
    });
    $scope.$on('layers.updated', function() {
        $('#layer_save_ok').show().fadeOut(3000);
        refreshTree();
    });
    $scope.$on('layers.deleted', MapproxyLayers.refresh);
    $scope.$on('layers.updatedStructure', function() {
        $('#layertree_save_ok').show().fadeOut(3000);
    })
}

function MapproxyLayerFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    $scope.addLayer = function() {
        if(angular.isDefined($scope.layer._id) || !$scope.exist($scope.layer.name)) {
            $scope.layer = clearData($scope.layer)
            MapproxyLayers.add(angular.copy($scope.layer));
            $scope.formTitle = "Edit layer"
            $scope.layer_form.$setPristine();
        } else {
            $scope.errorMsg = localize.getLocalizedString("Name already exists.");
            $('#layer_save_error').show().fadeOut(3000);
        }
    };
    $scope.resetForm = function() {
        $scope.layer = MapproxyLayers.current(true);
        $scope.layer_form.$setPristine();
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
    $scope.exist = function(name) {
        return (MapproxyLayers.byName(name)) ? true : false;
    };

    $scope.layer = angular.copy(DEFAULT_LAYER);
    MapproxyLayers.current(true, $scope.layer);
    $scope.formTitle = 'New layer';

    $scope.$on('layers.current', function() {
        $scope.layer = MapproxyLayers.current(true);
        $scope.formTitle = angular.equals($scope.layer, DEFAULT_LAYER) ? 'New layer' : 'Edit layer';
        $scope.layer_form.$setPristine();
    });

    $(window).on('beforeunload', function() {
        if($scope.layer_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
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
        $scope.globals_form.$setPristine();
    };

    $scope.globals = {'cache': {'meta_size': [null, null]}};

    $scope.$on('globals.load_complete', setGlobals);
    $scope.$on('globals.added', function() {
        $('#globals_save_ok').show().fadeOut(3000);
        setGlobals();
    });
    $scope.$on('globals.updated', function() {
        $('#globals_save_ok').show().fadeOut(3000);
        setGlobals();
    });

    $(window).on('beforeunload', function() {
        if($scope.globals_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyServicesChooserCtrl($scope, DataShareService) {
    $scope.getClasses = function(service) {
        var classes = "";
        if(service == $scope.selected) {
            classes += 'selected';
        }
        if(angular.isDefined($scope.services[service].active) && $scope.services[service].active) {
            classes += ' active';
        }
        return classes;
    };

    $scope.show = function(service) {
        $scope.selected = service
        DataShareService.data('service', service + '.html')
    };
    $scope.$on('dss.services', function() {
        $scope.services = DataShareService.data('services');
    });

    $scope.selected = 'wms';
};

function MapproxyServicesCtrl($scope, MapproxyServices, DataShareService) {
    var setServices = function() {
        var services = MapproxyServices.list();
        if(services.length > 0) {
            angular.forEach($scope.services, function(service, key) {
                $scope.services[key] = services[0][key];
            })
            DataShareService.data('services', $scope.services)
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
        $('#services_save_ok').show().fadeOut(3000);
        $scope.services_form.$setPristine();
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
    $scope.$on('dss.service', setTemplate);

    $(window).on('beforeunload', function() {
        if($scope.services_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxySourceNoticeCtrl($scope, localize, MapproxySources) {
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
    $scope.yaml_written = false;

    $http.get('/conf/base/yaml').success(function(result) {
        $scope.mapproxy_yaml = result;
        $scope.yaml_written = true;
    });
}