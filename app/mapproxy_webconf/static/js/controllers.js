var PAGE_LEAVE_MSG = "You have unsaved changes in this form. Realy leave the page and disgard unsaved changes?";

function TreeCtrl($scope, localize, WMSSources) {

    var refreshTree = function() {
        $scope.wms_list = WMSSources.list();
        $scope.wms_urls = WMSSources.allURLs();
    };
    var errorHandler = function() {
        $scope.treeErrorMsg = WMSSources.error();
        $('#capabilities_service_error').show().fadeOut(3000);
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

    $scope.$on('wms_capabilities.update_error', function() {
        $scope.treeErrorMsg = WMSSources.error();
        $('#capabilities_refresh_error').show().fadeOut(3000);
    });
    $scope.$on('wms_capabilities.delete_error', function() {
        $scope.treeErrorMsg = WMSSources.error();
        $('#capabilities_refresh_error').show().fadeOut(3000);
    });
    $scope.$on('wms_capabilities.load_error', errorHandler);
    $scope.$on('wms_capabilities.add_error', errorHandler);

    $scope.capabilities = {};
};

function MapproxySourceListCtrl($scope, localize, MapproxySources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}, "coverage": {}, "supported_srs": []};
    var refreshList = function() {
        $scope.mapproxy_sources = MapproxySources.list();
    };
    var errorHandler = function() {
        $scope.sourcelistErrorMsg = MapproxySources.error();
        $('#sourcelist_service_error').show().fadeOut(3000);
    };
    $scope.nameFilter = function(item) {
        return item.name.search($scope.sourceFilter) != -1;
    }
    $scope.isSelected = function(source) {
        var class_;
        if(angular.equals($scope.selected, source)) {
            class_ = 'selected';
        }
        return class_;
    };
    $scope.editSource = function(source) {
        $scope.selected = source
        MapproxySources.current(true, $.extend({}, DEFAULT_SOURCE, source));
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
        angular.forEach(source._dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(source) {
        var result = '<ul>';
        angular.forEach(source._dependencies, function(_dependencies, name) {
            if(_dependencies.length > 0) {
                result += '<li>' + name[0].toUpperCase() + name.slice(1) +'<ul>';
                if(name == 'layers') {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.title + '(' + dependency.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope.$on('sources.load_complete', refreshList);
    $scope.$on('sources.added', function() {
        $('.save_ok').show().fadeOut(3000);
        $scope.selected = MapproxySources.last();
        refreshList();
    });
    $scope.$on('sources.updated', function() {
        $('.save_ok').show().fadeOut(3000);
        $scope.selected = MapproxySources.last();
        refreshList();
    });
    $scope.$on('sources.deleted', function() {
        refreshList();
        MapproxySources.current(true, DEFAULT_SOURCE);
    });

    $scope.$on('sources.load_error', errorHandler);
    $scope.$on('sources.delete_error', errorHandler);
};

function MapproxySourceFormCtrl($scope, localize, MapproxySources, WMSSources) {
    var DEFAULT_SOURCE = {"type": "wms", "req": {}, "coverage": {}, "supported_srs": []};

    var errorHandler = function() {
        $scope.sourceformErrorMsg = MapproxySources.error();
        $('#sourceform_service_error').show().fadeOut(3000);
    };
    $scope.prepareForEditarea = function(data) {
        return $.extend({'name': ""}, data);
    };
    $scope.loadSRS = function() {
        var result = WMSSources.srs($scope.source.req.url);
        if(result) {
            angular.forEach(result, function(srs) {
                if($.inArray(srs, $scope.source.supported_srs) === -1) {
                    $scope.source.supported_srs.push(srs);
                }
            });
        }
    };
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
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.source = clearData($scope.source)

        var errorMsg = false;
        if(angular.isUndefined($scope.source.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if($scope.exist($scope.source.name, $scope.source._id)) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            if($scope._editarea.visible) {
                $scope._editarea.showErrorMsg(errorMsg);
            } else {
                $scope.sourceformErrorMsg = errorMsg;
                $('#sourceform_service_error').show().fadeOut(3000);
            }
        } else {
            MapproxySources.add($scope.source);
            $scope.formTitle = 'Edit source';
            $scope.source_form.$setPristine();
            $scope._editarea.dirty = false;
        }
    };
    $scope.addCoverage = function(event) {
        event.preventDefault();
        var bbox = WMSSources.coverage($scope.source.req.url);
        if(bbox) {
            $scope.source.coverage.bbox = bbox;
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
    $scope.addSRSManual = function(event) {
        event.preventDefault();
        if($.inArray($scope.custom.srs_manual, $scope.source.supported_srs) === -1) {
            $scope.source.supported_srs.push($scope.custom.srs_manual);
            $scope.custom.srs_manual = undefined;
        }
    };
    $scope.removeSRS = function(event, srs) {
        event.preventDefault();
        event.stopPropagation();
        var supportedSRSID = $.inArray(srs, $scope.source.supported_srs);
        if(supportedSRSID !== -1) {
            $scope.source.supported_srs.splice(supportedSRSID, 1);
        }
    };
    $scope.exist = function(name, id) {
        var source = MapproxySources.byName(name);
        if(source == false) {
            return false;
        } else if(source._id == id) {
            return false;
        }
        return true;
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
        $scope.source = {};
        $scope.source = MapproxySources.current(true);
        $scope.formTitle = angular.equals($scope.source, DEFAULT_SOURCE) ? 'New source' : 'Edit source';
        $scope.source_form.$setPristine();

        if($scope.source._manual) {
            $scope._editarea.show($scope.prepareForEditarea($scope.source));
        } else {
            $scope._editarea.visible = false;
        }
    });

    $scope.$on('sources.add_error', errorHandler);
    $scope.$on('sources.update_error', errorHandler);

    $scope.$on('editarea.save', function(scope, source) {
        $scope.source = source;
        $scope.addSource();
    });

    $scope.$watch('source_form.$valid', function(formValid) {
        if(formValid) {
            $('#source_form_save').addClass('btn-success');
        } else {
            $('#source_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.source_form.$dirty || $scope._editarea.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyCacheListCtrl($scope, MapproxyCaches) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
    var refreshList = function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    };
    var errorHandler = function() {
        $scope.cachelistErrorMsg = MapproxyCaches.error();
        $('#cachelist_service_error').show().fadeOut(3000);
    };
    $scope.nameFilter = function(item) {
        return item.name.search($scope.cacheFilter) != -1;
    }
    $scope.isSelected = function(cache) {
        var class_;
        if(angular.equals($scope.selected, cache)) {
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
        angular.forEach(cache._dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(cache) {
        var result = '<ul>';
        angular.forEach(cache._dependencies, function(_dependencies, name) {
            if(_dependencies.length > 0) {
                result += '<li>' + name[0].toUpperCase() + name.slice(1) +'<ul>';
                if(name == 'layers') {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.title + '(' + dependency.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope.$on('caches.load_complete', refreshList);
    $scope.$on('caches.added', function() {
        $('.save_ok').show().fadeOut(3000);
        $scope.selected = MapproxyCaches.last();
        refreshList();
    });
    $scope.$on('caches.updated', function() {
        $('.save_ok').show().fadeOut(3000);
        refreshList();
    });
    $scope.$on('caches.deleted', function() {
        refreshList();
        MapproxyCaches.current(true, DEFAULT_CACHE);
    });
    $scope.$on('caches.load_error', errorHandler);
    $scope.$on('caches.update_error', errorHandler);
    $scope.$on('caches.delete_error', errorHandler);
};

function MapproxyCacheFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyGrids) {
    var DEFAULT_CACHE = {'meta_size': [null, null]}
    var refreshGrids = function() {
        $scope.available_grids = MapproxyGrids.list();
    };
    var errorHandler = function() {
        $scope.cacheformErrorMsg = MapproxyCaches.error();
        $('#cacheform_service_error').show().fadeOut(3000);
    };
    $scope.replaceIdsWithNames = function(data) {
        data = angular.copy(data);
        var named = [];
        angular.forEach(data.sources, function(id) {
            var sourceName = MapproxySources.nameById(id);
            named.push(sourceName ? sourceName : id);
        });
        data.sources = named;
        named = [];
        angular.forEach(data.grids, function(id) {
            var gridName = MapproxyGrids.nameById(id);
            named.push(gridName ? gridName : id);
        });
        data.grids = named;
        return data;
    };
    $scope.replaceNamesWithIds = function(data) {
        data = angular.copy(data);
        var ids = [];
        angular.forEach(data.sources, function(name) {
            var sourceId = MapproxySources.idByName(name);
            ids.push(sourceId ? sourceId : name);
        });
        data.sources = ids;
        ids = [];
        angular.forEach(data.grids, function(name) {
            var gridId = MapproxyGrids.idByName(name);
            ids.push(gridId ? gridId : name);
        });
        data.grids = ids;
        return data;
    };
    $scope.prepareForEditarea = function(data) {
        return $scope.replaceIdsWithNames($.extend({'name': ''}, data));
    };
    $scope.addCache = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.cache = clearData($scope.cache);

        var errorMsg = false;
        if(angular.isUndefined($scope.cache.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if($scope.exist($scope.cache.name, $scope.cache._id)) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            if($scope._editarea.visible) {
                $scope._editarea.showErrorMsg(errorMsg);
            } else {
                $scope.cacheformErrorMsg = errorMsg;
                $('#cacheform_service_error').show().fadeOut(3000);
            }
        } else {
            MapproxyCaches.add($scope.cache);
            $scope.formTitle = 'Edit cache';
            $scope.cache_form.$setPristine();
            $scope._editarea.dirty = false;
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
        var name = MapproxySources.nameById(_id);
        return name ? name : _id;
    };
    $scope.exist = function(name, id) {
        var cache = MapproxyCaches.byName(name);
        if(cache == false) {
            return false;
        } else if(cache._id == id) {
            return false;
        }
        return true;
    }
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

        if($scope.cache._manual) {
            $scope._editarea.show($scope.replaceIdsWithNames($scope.cache));
        } else {
            $scope._editarea.visible = false;
        }
    });

    $scope.$on('grids.load_complete', refreshGrids);

    $scope.$on('caches.add_error', errorHandler);
    $scope.$on('caches.update_error', errorHandler);
    $scope.$on('grids.load_error', function() {
        $scope.cacheformErrorMsg = MapproxyGrids.error();
        $('#cacheform_service_error').show().fadeOut(3000);
    });

    $scope.$on('editarea.save', function(scope, cache) {
        $scope.cache = $scope.prepareForEditarea(cache);
        $scope.addCache();
    });

    $scope.$watch('cache_form.$valid', function(formValid) {
        if(formValid) {
            $('#cache_form_save').addClass('btn-success');
        } else {
            $('#cache_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.cache_form.$dirty || $scope._editarea.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });

};

function MapproxyGridListCtrl($scope, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    var refreshList = function() {
        $scope.default_grids = [];
        $scope.mapproxy_grids = [];
        angular.forEach(MapproxyGrids.list(), function(grid) {
            if(grid.default) {
                $scope.default_grids.push(grid);
            } else {
                $scope.mapproxy_grids.push(grid);
            }
        });
    };
    var errorHandler = function() {
        $scope.gridlistErrorMsg = MapproxyGrids.error();
        $('#gridlist_service_error').show().fadeOut(3000);
    };
    $scope.nameFilter = function(item) {
        return item.name.search($scope.gridFilter) != -1;
    }
    $scope.isSelected = function(grid) {
        var class_;
        if(angular.equals($scope.selected, grid)) {
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
        angular.forEach(grid._dependencies, function(kind) {
            if(kind.length > 0) {
                hasDependencies = true;
            }
        });
        return hasDependencies;
    };
    $scope.getDependencies = function(grid) {
        var result = '<ul>';
        angular.forEach(grid._dependencies, function(_dependencies, name) {
            if(_dependencies.length > 0) {
                result += '<li>' + name[0].toUpperCase() + name.slice(1) +'<ul>';
                if(name == 'layers') {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.title + '(' + dependency.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope.$on('grids.load_complete', refreshList);
    $scope.$on('grids.added', function() {
        $scope.selected = MapproxyGrids.last();
        refreshList();
    });
    $scope.$on('grids.updated', function() {
        $scope.selected = MapproxyGrids.last();
        refreshList();
    });
    $scope.$on('grids.deleted', function() {
        refreshList();
        MapproxyGrids.current(true, DEFAULT_GRID);
    });
    $scope.$on('grids.load_error', errorHandler);
    $scope.$on('grids.delete_error', errorHandler);
};

function MapproxyGridFormCtrl($scope, localize, MapproxyGrids) {
    var DEFAULT_GRID = {'bbox': [null, null, null, null]};
    var errorHandler = function() {
        $scope.gridformErrorMsg = MapproxyGrids.error();
        $('#gridform_service_error').show().fadeOut(3000);
    };
    $scope.prepareForEditarea = function(data) {
        return $.extend({'name': ""}, data);
    };
    $scope.addGrid = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.grid = clearData($scope.grid);

        var errorMsg = false;
        if(angular.isUndefined($scope.grid.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if($scope.exist($scope.grid.name, $scope.grid._id)) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            if($scope._editarea.visible) {
                $scope._editarea.showErrorMsg(errorMsg);
            } else {
                $scope.gridformErrorMsg = errorMsg;
                $('#gridform_service_error').show().fadeOut(3000);
            }
        } else {
            MapproxyGrids.add($scope.grid);
            $scope.formTitle = 'Edit grid';
            $scope.grid_form.$setPristine();
            $scope._editarea.dirty = false;
        }
    };
    $scope.resetForm = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid = MapproxyGrids.current(true);
        $scope.grid_form.$setPristine();
    };
    $scope.exist = function(name, id) {
        var grid = MapproxyGrids.byName(name);
        if(grid == false) {
            return false;
        } else if(grid._id == id) {
            return false;
        }
        return true;
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
        if($scope.grid.default) {
            $scope.formTitle = 'Default grid';
            $scope._editarea.visible = false;
        } else {
            $scope.grid_form.$setPristine();
            if($scope.grid._manual) {
                $scope._editarea.show($scope.prepareForEditarea($scope.grid));
            } else {
                $scope._editarea.visible = false;
            }
        }
    });

    $scope.$on('grids.added', function() {
       $('.save_ok').show().fadeOut(3000);
    });
    $scope.$on('grids.updated', function() {
       $('.save_ok').show().fadeOut(3000);
    });
    $scope.$on('grids.add_error', errorHandler);
    $scope.$on('grids.update_error', errorHandler);

    $scope.$on('editarea.save', function(scope, grid) {
        $scope.grid = grid;
        $scope.addGrid();
    });

    $scope.$watch('grid_form.$valid', function(formValid) {
        if(formValid) {
            $('#grid_form_save').addClass('btn-success');
        } else {
            $('#grid_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.grid_form.$dirty || $scope._editarea.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });

};

function MapproxyLayerListCtrl($scope, localize, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    var refreshTree = function() {
        $scope.mapproxy_layers = MapproxyLayers.tree();
    };
    var errorHandler = function() {
        $scope.layerlistErrorMsg = MapproxyLayers.error();
        $('#layerlist_service_error').show().fadeOut(3000);
    };
    $scope.nameFilter = function(item) {
        return item.name.search($scope.layerFilter) != -1;
    }
    $scope.isSelected = function(layer) {
        var class_;
        if(angular.equals($scope.selected, layer)) {
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
    $scope.listChanged = function() {
        $scope._listChanged = (!angular.equals($scope.mapproxy_layers, MapproxyLayers.tree()));
        return $scope._listChanged;
    }

    $scope.$on('layers.load_complete', refreshTree);
    $scope.$on('layers.added', function() {
        $scope.selected = MapproxyLayers.last();
        refreshTree();
    });
    $scope.$on('layers.updated', function() {
        $scope.selected = MapproxyLayers.last();
        refreshTree();
    });
    $scope.$on('layers.deleted', function() {
        MapproxyLayers.refresh();
        MapproxyLayers.current(true, DEFAULT_LAYER);
    });
    $scope.$on('layers.updatedStructure', function() {
        $('.list_save_ok').show().fadeOut(3000);
    });
    $scope.$on('layers.load_error', errorHandler);
    $scope.$on('layers.delete_error', errorHandler);
    $scope.$on('layers.updateStructure_error', errorHandler);

    $scope.$watch('_listChanged', function(changed) {
        if(changed) {
            $('#layer_list_save').addClass('btn-success');
        } else {
            $('#layer_list_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.listChanged()) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyLayerFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyLayers) {
    var DEFAULT_LAYER = {};
    var errorHandler = function() {
        $scope.layerformErrorMsg = MapproxyLayers.error();
        $('#layerform_service_error').show().fadeOut(3000);
    };
    $scope.replaceIdsWithNames = function(data) {
        data = angular.copy(data);
        var names = [];
        angular.forEach(data.sources, function(id) {
            var sourceName = MapproxySources.nameById(id) || MapproxyCaches.nameById(id);
            names.push(sourceName ? sourceName : id);
        });
        data.sources = names;
        return data;
    };
    $scope.prepareForEditarea = function(data) {
        data = $.extend({'name': ""}, data)
        return $scope.replaceIdsWithNames(data);
    };
    $scope.replaceNamesWithIds = function(data) {
        data = angular.copy(data);
        var ids = [];
        angular.forEach(data.sources, function(name) {
            var sourceId = MapproxySources.idByName(name) || MapproxyCaches.idByName(name);
            ids.push(sourceId ? sourceId : name);
        });
        data.sources = ids;
        return data;
    };
    $scope.addLayer = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.layer = clearData($scope.layer)

        var errorMsg = false;
        if(angular.isUndefined($scope.layer.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if($scope.exist($scope.layer.name, $scope.layer._id)) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            if($scope._editarea.visible) {
                $scope._editarea.showErrorMsg(errorMsg);
            } else {
                $scope.layerformErrorMsg = errorMsg;
                $('#layerform_service_error').show().fadeOut(3000);
            }
        } else {
            MapproxyLayers.add($scope.layer);
            $scope.formTitle = 'Edit layer';
            $scope.layer_form.$setPristine();
            $scope._editarea.dirty = false;
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
        var name = MapproxySources.nameById(_id) || MapproxyCaches.nameById(_id);
        return name ? name : _id;
    };
    $scope.exist = function(name, id) {
        var layer = MapproxyLayers.byName(name);
        if(layer == false) {
            return false;
        } else if(layer._id == id) {
            return false;
        }
        return true;
    };

    $scope.layer = angular.copy(DEFAULT_LAYER);
    MapproxyLayers.current(true, $scope.layer);
    $scope.formTitle = 'New layer';

    $scope.$on('layers.current', function() {
        $scope.layer = MapproxyLayers.current(true);
        $scope.formTitle = angular.equals($scope.layer, DEFAULT_LAYER) ? 'New layer' : 'Edit layer';
        $scope.layer_form.$setPristine();

        if($scope.layer._manual) {
            $scope._editarea.show($scope.prepareForEditarea($scope.layer));
        } else {
            $scope._editarea.visible = false;
        }
    });

    $scope.$on('layers.added', function() {
        $('.save_ok').show().fadeOut(3000);
    });
    $scope.$on('layers.updated', function() {
        $('.save_ok').show().fadeOut(3000);
    });
    $scope.$on('editarea.save', function(scope, layer) {
        $scope.layer = $scope.replaceNamesWithIds(layer);
        $scope.addLayer();
    });
    $scope.$on('layers.add_error', errorHandler);
    $scope.$on('layers.update_error', errorHandler);

    $scope.$watch('layer_form.$valid', function(formValid) {
        if(formValid) {
            $('#layer_form_save').addClass('btn-success');
        } else {
            $('#layer_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.layer_form.$dirty || $scope._editarea.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyGlobalsChooserCtrl($scope, DataShareService) {
    $scope.getClasses = function(global) {
        var classes = "";
        if(global == $scope.selected) {
            classes += 'selected';
        }
        if(angular.isDefined($scope.globals[global].active) && $scope.globals[global].active) {
            classes += ' active';
        }
        return classes;
    };
    $scope.filtered = function() {
        var result = {}
        angular.forEach($scope.globals, function(value, key) {
            if(key[0] != '_') {
                result[key] = value;
            }
        });
        return result;
    };

    $scope.show = function(global) {
        $scope.selected = global;
        DataShareService.data('global', global + '.html');
    };
    $scope.$on('dss.globals', function() {
        $scope.globals = DataShareService.data('globals');
    });
    $scope.$on('dss._editarea_visible', function() {
        $scope._editarea_visible = DataShareService.data('_editarea_visible');
    });

    $scope.selected = 'cache';
    $scope._editarea_visible = false;
};

function MapproxyGlobalsFormCtrl($scope, localize, MapproxyGlobals, DataShareService) {
    var setGlobals = function() {
        var globals = MapproxyGlobals.list();
        if(globals.length > 0) {
            $scope.globals = $.extend($scope.globals, globals[0]);
        }
        DataShareService.data('globals', $scope.globals);
        if($scope.globals._manual) {
            DataShareService.data('_editarea_visible', true);
            $scope._editarea.show($scope.globals)
        }
    };
    var setTemplate = function() {
        $scope.template = DataShareService.data('global');
    };
    var errorHandler = function() {
        $scope.errorMsg = MapproxyGlobals.error();
        $('#globals_service_error').show().fadeOut(3000);
    };
    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.globals = clearData($scope.globals);
        MapproxyGlobals.add($scope.globals);
        $scope.globals_form.$setPristine();
    };

    $scope.globals = {
        'cache': {
            'meta_size': [null, null]
        },
        'image': {}
    };

    DataShareService.data('globals', $scope.globals);

    $scope.template = "cache.html";

    $scope.$on('globals.load_complete', setGlobals);
    $scope.$on('globals.added', function() {
        $('.save_ok').show().fadeOut(3000);
        setGlobals();
    });
    $scope.$on('globals.updated', function() {
        $('.save_ok').show().fadeOut(3000);
        setGlobals();
    });
    $scope.$on('dss.global', setTemplate);
    $scope.$on('globals.load_error', errorHandler);
    $scope.$on('globals.add_error', errorHandler);
    $scope.$on('globals.update_error', errorHandler);

    $scope.$on('editarea.save', function(scope, globals) {
        $scope.globals = globals;
        MapproxyGlobals.add($scope.globals);
    });

    $scope.$watch('globals_form.$valid', function(formValid) {
        if(formValid) {
            $('#globals_form_save').addClass('btn-success');
        } else {
            $('#globals_form_save').removeClass('btn-success');
        }
    });

    $scope.$watch('_editarea.visible', function(visible, b) {
        DataShareService.data('_editarea_visible', visible);
    });

    $(window).on('beforeunload', function() {
        if($scope.globals_form.$dirty || $scope._editarea.dirty) {
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

function MapproxyServicesCtrl($scope, localize, MapproxyServices, DataShareService) {
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
    };
    var errorHandler = function() {
        $scope.errorMsg = MapproxyServices.error();
        $('#services_service_error').show().fadeOut(3000);
    };
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
    $scope.$on('services.added', function() {
        $('.save_ok').show().fadeOut(3000);
        $scope.services_form.$setPristine();
        setServices();
    });
    $scope.$on('services.updated', function() {
        $('.save_ok').show().fadeOut(3000);
        $scope.services_form.$setPristine();
        setServices();
    });
    $scope.$on('dss.service', setTemplate);
    $scope.$on('services.load_error', errorHandler);
    $scope.$on('services.add_error', errorHandler);
    $scope.$on('services.update_error', errorHandler);

    $scope.$watch('services_form.$valid', function(formValid) {
        if(formValid) {
            $('#services_form_save').addClass('btn-success');
        } else {
            $('#services_form_save').removeClass('btn-success');
        }
    });

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
};

function MapproxyConfigCtrl($scope, $http) {

    $scope.mapproxy_yaml = undefined;
    $scope.yaml_written = false;

    $http.get('/conf/base/yaml').success(function(result) {
        $scope.mapproxy_yaml = result;
        $scope.yaml_written = true;
    });
};