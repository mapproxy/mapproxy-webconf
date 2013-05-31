var PAGE_LEAVE_MSG = "You have unsaved changes in this form. Realy leave the page and disgard unsaved changes?";

function TreeCtrl($scope, localize, WMSSources, MessageService) {

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
        WMSSources.add({data: {url: $scope.capabilities.url}});
    };
    $scope.refreshCapabilities = function(event, wms) {
        event.stopPropagation();
        WMSSources.refresh(wms);
    };
    $scope.removeCapabilities = function(wms) {
        WMSSources.remove(wms);
    };
    $scope.showMap = function(event, wms) {
        event.stopPropagation();
        var layers = [];
        var srs = ($.inArray('EPSG:4326', wms.data.layer.srs) != -1 || $.inArray('epsg:4326', wms.data.layer.srs) != -1) ?
            'EPSG:4326' : wms.data.layer.srs[0];
        var extent = wms.data.layer.llbbox;
        angular.forEach(wms.data.layer.layers, function(layer) {
            layers.push(new OpenLayers.Layer.WMS(layer.title, wms.data.url, {
                layers: [layer.name],
                srs: srs,
                transparent: !layer.opaque
            }, {
              singleTile: true,
              ratio: 1.0
            }));
        });
        $scope.olmapBinds = {
            visible: true,
            proj: srs,
            extent: extent,
            layers: layers
        }
    }

    $scope._messageService = MessageService;
    $scope.$watch('_messageService.messages.wms_capabilities.load_success', refreshTree, true);
    $scope.$watch('_messageService.messages.wms_capabilities.delete_success', refreshTree, true);
    $scope.$watch('_messageService.messages.wms_capabilities.add_success', refreshTree, true);
    $scope.$watch('_messageService.messages.wms_capabilities.update_success', refreshTree, true);

    $scope.$on('olmap.ready', function(scope, map) {
        $scope.map = map;
    });

    $scope.capabilities = {};
};

function MapproxySourceListCtrl($scope, localize, MapproxySources, MessageService) {
    var DEFAULT_SOURCE = {'data': {"type": "wms", "req": {}, "coverage": {}, "supported_srs": [], 'units': 'm'}};
    var refreshList = function() {
        $scope.mapproxy_sources = MapproxySources.list();
    };
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
                        result += '<li>' + dependency.data.title + '(' + dependency.data.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.data.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope._messageService = MessageService;
    $scope.$watch('_messageService.messages.sources.load_success', refreshList, true);
    $scope.$watch('_messageService.messages.sources.add_success', function() {
        $scope.selected = MapproxySources.last();
        refreshList();
    }, true);
    $scope.$watch('_messageService.messages.sources.update_success', function() {
        $scope.selected = MapproxySources.last();
        refreshList();
    }, true);
    $scope.$watch('_messageService.messages.sources.delete_success', function() {
        refreshList();
        MapproxySources.current(true, DEFAULT_SOURCE);
    }, true);
};

function MapproxySourceFormCtrl($scope, $http, localize, MapproxySources, WMSSources, ProjectDefaults, MessageService, MapproxyCaches) {
    var DEFAULT_SOURCE = {"data": {"type": "wms", "req": {}, "coverage": {}, 'units': 'm'}};

    var convertResScales = function(url, mode) {
        if(angular.isDefined($scope.custom.min_res) || angular.isDefined($scope.custom.max_res)) {
            data = [
                $scope.custom.min_res || null,
                $scope.custom.max_res || null
            ];
            $http.post(url, {
                "data": data,
                "dpi": $scope.defaults.data.dpi,
                "units": $scope.source.data.units,
                "mode": mode
            }).success(function(response) {
                $scope.custom.min_res = response.result[0];
                $scope.custom.max_res = response.result[1];
            });
        }
    };
    var setSource = function() {
        $scope.source = {};
        $scope.source = MapproxySources.current(true);
        $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.source);
        if(angular.equals($scope.source, DEFAULT_SOURCE)) {
            $scope.formTitle = 'New source';
            if(angular.isDefined($scope.defaults.data.srs)) {
                $scope.source.data.supported_srs = angular.copy($scope.defaults.data.srs);
            }
        } else {
            $scope.formTitle = 'Edit source';
        }

        $scope.custom.min_res = $scope.source.data['min_res'] || $scope.source.data['min_res_scale'];
        $scope.custom.max_res = $scope.source.data['max_res'] || $scope.source.data['max_res_scale'];
        $scope.custom.resSelected = !(angular.isDefined($scope.source.data['min_res_scale']) || angular.isDefined($scope.source.data['max_res_scale']));
        if($scope.custom.resSelected) {
            $scope.custom.min_resLabel = 'min_res';
            $scope.custom.max_resLabel = 'max_res';
        } else {
            $scope.custom.min_resLabel = 'min_res_scale';
            $scope.custom.max_resLabel = 'max_res_scale';
        }

        $scope.source_form.$setPristine();

        if($scope.source._manual) {
            $scope.editareaBinds.visible = true;
        } else {
            $scope.editareaBinds.visible = false;
        }
    };

    $scope.prepareForEditarea = function(source) {
        return $.extend(true, {'data': {'name': ""}}, source);
    };
    $scope.loadSRS = function() {
        var result = WMSSources.srs($scope.source.data.req.url);
        if(result) {
            angular.forEach(result, function(srs) {
                if($.inArray(srs, $scope.source.data.supported_srs) === -1) {
                    if(angular.isUndefined($scope.source.data.supported_srs)) {
                        $scope.source.data.supported_srs = [srs];
                    } else {
                        $scope.source.data.supported_srs.push(srs);
                    }
                }
            });
        }
    };
    $scope.openDialog = function(callback, new_data) {
        if(angular.isUndefined($scope.source.data.req) ||
           angular.isUndefined($scope.source.data.req.url) ||
           angular.isUndefined($scope.source.data.req.layers) ||
           $scope.source.data.req.layers.length == 0) {
            callback(true);
        } else  {
            var buttons = {};
            buttons[localize.getLocalizedString('Change URL')] = function() {
                $(this).dialog("close");
                $scope.source.data.req.layers = undefined;
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
                modal: true,
                buttons: buttons
            });
        }
    };
    $scope.checkURL = function(callback, new_data) {
        var addLayer = false;
        var urlReplaceAsk = false;
        if(angular.isUndefined($scope.source.data.req.url)) {
            $scope.source.data.req.url = new_data.sourceURL;
            addLayer = true;
        } else {
            if(angular.equals($scope.source.data.req.url, new_data.sourceURL)) {
                addLayer = true;
            } else {
                urlReplaceAsk = true;
            }
        }
        if(urlReplaceAsk) {
            var buttons = {};
            buttons[localize.getLocalizedString("Change url and insert layer")] = function() {
                $(this).dialog("close");
                $scope.source.data.req.url = new_data.sourceURL;
                $scope.source.data.req.layers = undefined;
                $scope.$apply();
                callback(true);
            };
            buttons[localize.getLocalizedString("Keep url and reject layer")] = function() {
                $(this).dialog("close");
                callback(false);
            };
            $('#confirm_url_change_dialog').dialog({
                resizeable: false,
                width: 600,
                height: 250,
                modal: true,
                buttons: buttons
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
        if(angular.isUndefined($scope.source.data.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else {
            //found is the section of element with $scope.source.data.name if found
            var found = nameExistInService(
                $scope.source.data.name,
                $scope.source._id,
                MapproxySources,
                [MapproxySources, MapproxyCaches]);
            if(found) {
                errorMsg = localize.getLocalizedString('Name already exists in ' + found)
            }
        }
        if(errorMsg) {
            MessageService.message('sources', 'form_error', errorMsg);
        } else {
            $scope.source._manual = $scope.editareaBinds.visible;
            if(!$scope.source._manual) {
                var mode = $scope.custom.resSelected ? '' : '_scale';
                $scope.source.data['min_res' + mode] = angular.isDefined($scope.custom.min_res) ? $scope.custom.min_res : undefined;
                $scope.source.data['max_res' + mode] = angular.isDefined($scope.custom.max_res) ? $scope.custom.max_res : undefined;
                if(mode == '') {
                    delete $scope.source.data.min_res_scale;
                    delete $scope.source.data.max_res_scale;
                } else {
                    delete $scope.source.data.min_res;
                    delete $scope.source.data.max_res;
                }
            }
            MapproxySources.add($scope.source);
            $scope.formTitle = 'Edit source';
            $scope.source_form.$setPristine();
            $scope.editareaBinds.dirty = false;
            $scope.editareaBinds.save = false;
        }
    };
    $scope.addCoverage = function(event) {
        event.preventDefault();
        var bbox = WMSSources.coverage($scope.source.data.req.url);
        if(bbox) {
            if(angular.isUndefined($scope.source.data.coverage)) {
                $scope.source.data.coverage = {
                    'bbox': bbox,
                    'srs': 'EPSG:4326'
                };
            } else {
                $scope.source.data.coverage.bbox = bbox;
                $scope.source.data.coverage.srs = 'EPSG:4326';
            }
        }
    };
    $scope.resetForm = function(event) {
        if(!angular.isUndefined(event)) {
            event.preventDefault();
        }
        setSource();
    };
    $scope.addLayerManual = function(event) {
        event.preventDefault();
        var new_layer = $scope.custom.layer_manual;
        if(angular.isDefined(new_layer)) {
            if(!angular.isArray($scope.source.data.req.layers)) {
                $scope.source.data.req.layers = [new_layer];
            } else {
                $scope.source.data.req.layers.push(new_layer);
            }
            $scope.custom.layer_manual = undefined;
        }
    };
    $scope.addSRSManual = function(event) {
        event.preventDefault();
        if($.inArray($scope.custom.srs_manual, $scope.source.data.supported_srs) === -1) {
            if(angular.isUndefined($scope.source.data.supported_srs)) {
                $scope.source.data.supported_srs = [$scope.custom.srs_manual];
            } else {
                $scope.source.data.supported_srs.push($scope.custom.srs_manual);
            }
            $scope.custom.srs_manual = undefined;
        }
    };
    $scope.removeSRS = function(event, srs) {
        event.preventDefault();
        event.stopPropagation();
        var supportedSRSID = $.inArray(srs, $scope.source.data.supported_srs);
        if(supportedSRSID !== -1) {
            $scope.source.data.supported_srs.splice(supportedSRSID, 1);
        }
    };
    $scope.layerTitle = function(layer) {
        return WMSSources.layerTitle($scope.source.data.req.url, layer);
    };
    $scope.getResolution = function(url) {
        if(!$scope.custom.resSelected) {
            $scope.custom.resSelected = true;
            $scope.custom.min_resLabel = 'min_res';
            $scope.custom.max_resLabel = 'max_res';
            convertResScales(url, 'res');
            safeApply($scope);
        }
    };
    $scope.getScale = function(url) {
        if($scope.custom.resSelected) {
            $scope.custom.resSelected = false;
            $scope.custom.min_resLabel = 'min_res_scale';
            $scope.custom.max_resLabel = 'max_res_scale';
            convertResScales(url, 'scale');
            safeApply($scope);
        }
    };

    //must defined here if this controller should own all subelements of custom/source
    $scope.custom = {
        'resSelected': true,
        'min_resLabel': 'min_res',
        'max_resLabel': 'max_res'
    };
    $scope.defaults = {};

    $scope.source = angular.copy(DEFAULT_SOURCE);
    $scope.formTitle = 'New source';

    $scope.editareaBinds = {
        editareaValue: $scope.prepareForEditarea($scope.source),
        visible: false,
        dirty: false
    };

    $scope.$watch('editareaBinds.save', function(save) {
        if(save) {
            $scope.source = $scope.editareaBinds.editareaValue;
            $scope.addSource();
        }
    }, true);

    MapproxySources.current(true, $scope.source);

    $scope.$on('sources.current', setSource);

    $scope._messageService = MessageService;
    $scope.$watch('_messageService.messages.defaults.load_success', function() {
        var defaults = ProjectDefaults.list();
        if(defaults.length > 0) {
            $scope.defaults = defaults[0];
        }
    });

    $scope.$watch('source', function() {
            $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.source);
        }, true
    );

    $scope.$watch('source_form.$valid', function(formValid) {
        if(formValid) {
            $('#source_form_save').addClass('btn-success');
        } else {
            $('#source_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.source_form.$dirty || $scope.editareaBinds.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyCacheListCtrl($scope, MapproxyCaches, MessageService) {
    var DEFAULT_CACHE = {'data': {'meta_size': [null, null]}};
    var refreshList = function() {
        $scope.mapproxy_caches = MapproxyCaches.list();
    };
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
                        result += '<li>' + dependency.data.title + '(' + dependency.data.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.data.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope._messageService = MessageService;
    $scope.$watch('_messageService.messages.caches.load_success', refreshList);
    $scope.$watch('_messageService.messages.caches.add_success', function() {
        $scope.selected = MapproxyCaches.last();
        refreshList();
    });
    $scope.$watch('_messageService.messages.caches.update_success', refreshList);
    $scope.$watch('_messageService.messages.caches.delete_success', function() {
        refreshList();
        MapproxyCaches.current(true, DEFAULT_CACHE);
    });
};

function MapproxyCacheFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyGrids, MessageService) {
    var DEFAULT_CACHE = {'data': {'meta_size': [null, null]}};
    var refreshGrids = function() {
        $scope.available_grids = MapproxyGrids.list();
    };

    $scope.replaceIdsWithNames = function(cache) {
        cache = angular.copy(cache);
        var named = [];
        angular.forEach(cache.data.sources, function(id) {
            var sourceName = MapproxySources.nameById(id) || MapproxyCaches.nameById(id);
            named.push(sourceName ? sourceName : id);
        });
        cache.data.sources = named;
        named = [];
        angular.forEach(cache.data.grids, function(id) {
            var gridName = MapproxyGrids.nameById(id);
            named.push(gridName ? gridName : id);
        });
        cache.data.grids = named;
        return cache;
    };
    $scope.replaceNamesWithIds = function(cache) {
        cache = angular.copy(cache);
        var ids = [];
        angular.forEach(cache.data.sources, function(name) {
            var sourceId = MapproxySources.idByName(name);
            ids.push(sourceId ? sourceId : name);
        });
        cache.data.sources = ids;
        ids = [];
        angular.forEach(cache.data.grids, function(name) {
            var gridId = MapproxyGrids.idByName(name) || MapproxyCaches.idByName(name);
            ids.push(gridId ? gridId : name);
        });
        cache.data.grids = ids;
        return cache;
    };
    $scope.prepareForEditarea = function(cache) {
        return $scope.replaceIdsWithNames($.extend(true, {'data': {'name': ''}}, cache));
    };
    $scope.checkName = function(callback, new_item) {
        callback($scope.cache.data.name !== new_item.data.name)
    };
    $scope.addCache = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.cache = clearData($scope.cache);

        var errorMsg = false;
        if(angular.isUndefined($scope.cache.data.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else {
            //found is the section of element with $scope.cache.data.name if found
            var found = nameExistInService(
                $scope.cache.data.name,
                $scope.cache._id,
                MapproxyCaches,
                [MapproxySources, MapproxyCaches]);
            if(found) {
                errorMsg = localize.getLocalizedString('Name already exists in ' + found)
            }
        }
        if(errorMsg) {
            MessageService.message('caches', 'form_error', errorMsg);
        } else {
            $scope.cache._manual = $scope.editareaBinds.visible;
            MapproxyCaches.add($scope.cache);
            $scope.formTitle = 'Edit cache';
            $scope.cache_form.$setPristine();
            $scope.editareaBinds.dirty = false;
            $scope.editareaBinds.save = false;
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
        var name = MapproxySources.nameById(_id) || MapproxyCaches.nameById(_id) || MapproxyGrids.nameById(_id);
        return name ? name : _id;
    };
    $scope.cache = angular.copy(DEFAULT_CACHE);
    $scope.formTitle = 'New cache';

    $scope.editareaBinds = {
        editareaValue: $scope.prepareForEditarea($scope.cache),
        visible: false,
        dirty: false
    };

    MapproxyCaches.current(true, $scope.cache);

    $scope.$on('caches.current', function() {
        $scope.cache = {};
        $scope.cache = MapproxyCaches.current(true);
        $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.cache);
        if(angular.isUndefined($scope.cache.data.meta_size)) {
            $scope.cache.data.meta_size = [null, null];
        }
        $scope.formTitle = angular.equals($scope.cache, DEFAULT_CACHE) ? 'New cache' : 'Edit cache';
        $scope.cache_form.$setPristine();

        if($scope.cache._manual) {
            $scope.editareaBinds.visible = true;
        } else {
            $scope.editareaBinds.visible = false;
        }
    });

    $scope._messageService = MessageService;

    $scope.$watch('_messageService.messages.grids.load_success', refreshGrids);

    $scope.$watch('editareaBinds.save', function(save) {
        if(save) {
            $scope.cache = $scope.editareaBinds.editareaValue;
            $scope.addCache();
        }
    }, true);

    $scope.$watch('cache_form.$valid', function(formValid) {
        if(formValid) {
            $('#cache_form_save').addClass('btn-success');
        } else {
            $('#cache_form_save').removeClass('btn-success');
        }
    });

    $scope.$watch('cache', function() {
        $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.cache);
    }, true)

    $(window).on('beforeunload', function() {
        if($scope.cache_form.$dirty || $scope.editareaBinds.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyGridListCtrl($scope, MapproxyGrids, MessageService) {
    var DEFAULT_GRID = {'data': {'bbox': [null, null, null, null], 'units': 'm'}};
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
                        result += '<li>' + dependency.data.title + '(' + dependency.data.name + ')</li>';
                    });
                } else {
                    angular.forEach(_dependencies, function(dependency) {
                        result += '<li>' + dependency.data.name + '</li>';
                    });
                }
                result += '</ul>';
            }
        });
        result += '</ul>';
        return result;
    };

    $scope._messageService = MessageService
    $scope.$watch('_messageService.messages.grids.load_success', refreshList);
    $scope.$watch('_messageService.messages.grids.add_success', function() {
        $scope.selected = MapproxyGrids.last();
        refreshList();
    });
    $scope.$watch('_messageService.messages.grids.update_success', function() {
        $scope.selected = MapproxyGrids.last();
        refreshList();
    });
    $scope.$watch('_messageService.messages.grids.delete_success', function() {
        refreshList();
        MapproxyGrids.current(true, DEFAULT_GRID);
    });
};

function MapproxyGridFormCtrl($scope, $http, localize, MapproxyGrids, MessageService, ProjectDefaults) {
    var DEFAULT_GRID = {'data': {'bbox': [null, null, null, null], 'units': 'm'}};
    var convertResScales = function(url, mode) {
        if($scope.custom.res_scales.length > 0) {
            $http.post(url, {
                "data": $scope.custom.res_scales,
                "dpi": $scope.defaults.data.dpi,
                "units": $scope.grid.data.units,
                "mode": mode
            }).success(function(response) {
                $scope.custom.res_scales = response.result;
            });
        }
    };

    var addScalesResToGrid = function() {
        if($scope.custom.res_scales.length > 0) {
            if($scope.custom.resSelected) {
                delete $scope.grid.data.scales;
                $scope.grid.data.res = $scope.custom.res_scales;
            } else {
                delete $scope.grid.data.res;
                $scope.grid.data.scales = $scope.custom.res_scales
            }
        }
    };

    $scope.prepareForEditarea = function(data) {
        return $.extend(true, {'data': {'name': ""}}, data);
    };
    $scope.addGrid = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        if(!$scope.editareaBinds.save) {
            addScalesResToGrid();
        }

        $scope.grid = clearData($scope.grid);

        var errorMsg = false;
        if(angular.isUndefined($scope.grid.data.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if(nameExistInService(
            $scope.grid.data.name,
            $scope.grid._id,
            MapproxyGrids,
            [MapproxyGrids]
        )) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            MessageService.message('grids', 'form_error', errorMsg);
        } else {
            $scope.grid._manual = $scope.editareaBinds.visible;
            MapproxyGrids.add($scope.grid);
            $scope.formTitle = 'Edit grid';
            $scope.grid_form.$setPristine();
            $scope.editareaBinds.dirty = false;
            $scope.editareaBinds.save = false;
        }
    };
    $scope.lockGrid = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.grid._locked = true;
        $scope.addGrid();
    };
    $scope.unlockGrid = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid._locked = false;
        $scope.addGrid();
    };
    $scope.getResolutions = function(url) {
        if(!$scope.custom.resSelected) {
            $scope.custom.resSelected = true;
            convertResScales(url, 'scales');
        }
    };
    $scope.getScales = function(url) {
        if($scope.custom.resSelected) {
            $scope.custom.resSelected = false;
            convertResScales(url, 'res');
        }
    };
    $scope.resetForm = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.grid = MapproxyGrids.current(true);
        $scope.grid_form.$setPristine();
    };
    $scope.custom = {
        'res_scales': [],
        'resSelected': true
    };
    $scope.grid = angular.copy(DEFAULT_GRID);
    $scope.formTitle = 'New grid';

    $scope.editareaBinds = {
        editareaValue: $scope.prepareForEditarea($scope.grid),
        visible: false,
        dirty: false
    };

    MapproxyGrids.current(true, $scope.grid);

    $scope.$on('grids.current', function() {
        $scope.grid = MapproxyGrids.current(true);

        if(angular.isDefined($scope.grid.data.scales)) {
            $scope.custom.res_scales = angular.copy($scope.grid.data.scales);
            $scope.custom.resSelected = false;
        } else if(angular.isDefined($scope.grid.data.res)) {
            $scope.custom.res_scales = angular.copy($scope.grid.data.res);
            $scope.custom.resSelected = true;
        } else {
            $scope.custom.res_scales = [];
            $scope.custom.resSelected = true
        }

        $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.grid);

        if(angular.isUndefined($scope.grid.data.bbox)) {
            $scope.grid.data.bbox = [null, null, null, null];
        }

        $scope.formTitle = angular.equals($scope.grid, DEFAULT_GRID) ? 'New grid' : 'Edit grid';

        if($scope.grid.default) {
            $scope.formTitle = 'Default grid';
            $scope.editareaBinds.visible = false;
        } else {
            $scope.grid_form.$setPristine();
            if($scope.grid._manual) {
                $scope.editareaBinds.visible = true;
            } else {
                $scope.editareaBinds.visible = false;
            }
        }

        safeApply($scope);
    });

    $scope.$watch('editareaBinds.save', function(save) {
        if(save) {
            $scope.grid = $scope.editareaBinds.editareaValue;
            $scope.addGrid();
        }
    }, true);

    $scope.$watch('editareaBinds.visible', function(visible) {
        if(visible) {
            addScalesResToGrid();
            $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.grid);
        }
    }, true);

    $scope.$watch('grid_form.$valid', function(formValid) {
        if(formValid) {
            $('#grid_form_save').addClass('btn-success');
        } else {
            $('#grid_form_save').removeClass('btn-success');
        }
    });

    $scope._messageService = MessageService;

    $scope.$watch('_messageService.messages.defaults.load_success', function() {
        var defaults = ProjectDefaults.list();
        if(defaults.length > 0) {
            $scope.defaults = defaults[0];
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.grid_form.$dirty || $scope.editareaBinds.dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};

function MapproxyLayerListCtrl($scope, localize, MapproxyLayers, MessageService) {
    var DEFAULT_LAYER = {'data': {}};
    var refreshTree = function() {
        $scope.mapproxy_layers = MapproxyLayers.tree();
    };
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

    $scope._messageService = MessageService;

    $scope.$watch('_messageService.messages.layers.load_success', refreshTree);
    $scope.$watch('_messageService.messages.layers.add_success', function() {
        $scope.selected = MapproxyLayers.last();
        refreshTree();
    });
    $scope.$watch('_messageService.messages.layers.update_success', function() {
        $scope.selected = MapproxyLayers.last();
        refreshTree();
    });
    $scope.$watch('_messageService.messages.delete_success', function() {
        MapproxyLayers.refresh();
        MapproxyLayers.current(true, DEFAULT_LAYER);
    });

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

function MapproxyLayerFormCtrl($scope, localize, MapproxySources, MapproxyCaches, MapproxyLayers, MessageService) {
    var DEFAULT_LAYER = {'data': {}};

    $scope.replaceIdsWithNames = function(layer) {
        layer = angular.copy(layer);
        var names = [];
        angular.forEach(layer.data.sources, function(id) {
            var sourceName = MapproxySources.nameById(id) || MapproxyCaches.nameById(id);
            names.push(sourceName ? sourceName : id);
        });
        layer.data.sources = names;
        return layer;
    };
    $scope.prepareForEditarea = function(layer) {
        layer = $.extend(true, {'data': {'name': ""}}, layer)
        return $scope.replaceIdsWithNames(layer);
    };
    $scope.replaceNamesWithIds = function(layer) {
        layer = angular.copy(layer);
        var ids = [];
        angular.forEach(layer.data.sources, function(name) {
            var sourceId = MapproxySources.idByName(name) || MapproxyCaches.idByName(name);
            ids.push(sourceId ? sourceId : name);
        });
        layer.data.sources = ids;
        return layer;
    };
    $scope.addLayer = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }

        $scope.layer = clearData($scope.layer)

        var errorMsg = false;
        if(angular.isUndefined($scope.layer.data.name)) {
            errorMsg = localize.getLocalizedString("Name required.");
        } else if(nameExistInService(
            $scope.layer.data.name,
            $scope.layer._id,
            MapproxyLayers,
            [MapproxyLayers]
        )) {
            errorMsg = localize.getLocalizedString("Name already exists.");
        }
        if(errorMsg) {
            MessageService.message('layers', 'form_error', errorMsg);
        } else {
            $scope.layer._manual = $scope.editareaBinds.visible;
            MapproxyLayers.add($scope.layer);
            $scope.formTitle = 'Edit layer';
            $scope.layer_form.$setPristine();
            $scope.editareaBinds.dirty = false;
            $scope.editareaBinds.save = false;
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

    $scope.layer = angular.copy(DEFAULT_LAYER);
    MapproxyLayers.current(true, $scope.layer);
    $scope.formTitle = 'New layer';

    $scope.editareaBinds = {
        editareaValue: $scope.prepareForEditarea($scope.layer),
        visible: false,
        dirty: false
    };

    $scope.$on('layers.current', function() {
        $scope.layer = MapproxyLayers.current(true);
        $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.layer);
        $scope.formTitle = angular.equals($scope.layer, DEFAULT_LAYER) ? 'New layer' : 'Edit layer';
        $scope.layer_form.$setPristine();

        if($scope.layer._manual) {
            $scope.editareaBinds.visible = true;
        } else {
            $scope.editareaBinds.visible = false;
        }
    });

    $scope.$watch('editareaBinds.save', function(save) {
        if(save) {
            $scope.layer = $scope.editareaBinds.editareaValue;
            $scope.addLayer();
        }
    }, true);
    $scope.$watch('layer_form.$valid', function(formValid) {
        if(formValid) {
            $('#layer_form_save').addClass('btn-success');
        } else {
            $('#layer_form_save').removeClass('btn-success');
        }
    });
    $scope.$watch('layer', function() {
            $scope.editareaBinds.editareaValue = $scope.prepareForEditarea($scope.layer);
        }, true
    );

    $(window).on('beforeunload', function() {
        if($scope.layer_form.$dirty || $scope.editareaBinds.dirty) {
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
        if(angular.isDefined($scope.globals.data[global].active) && $scope.globals.data[global].active) {
            classes += ' active';
        }
        return classes;
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

function MapproxyGlobalsFormCtrl($scope, localize, MapproxyGlobals, DataShareService, MessageService) {
    var setGlobals = function() {
        var globals = MapproxyGlobals.list();
        if(globals.length > 0) {
            $scope.globals = $.extend(true, $scope.globals, globals[0]);
        }
        DataShareService.data('globals', $scope.globals);
        $scope.editareaBinds.editareaValue = $scope.globals;
        if($scope.globals._manual) {
            $scope.editareaBinds.visible = true;
        }
    };
    var setTemplate = function() {
        $scope.template = DataShareService.data('global');
    };
    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.globals._manual = $scope.editareaBinds.visible;
        MapproxyGlobals.add($scope.globals);
        $scope.globals_form.$setPristine();
        $scope.editareaBinds.dirty = false;
        $scope.editareaBinds.save = false;
    };

    $scope.globals = {
        'data': {
            'cache': {
                'meta_size': [null, null]
            },
            'image': {}
        }
    };

    DataShareService.data('globals', $scope.globals);

    $scope.editareaBinds = {
        editareaValue: $scope.globals,
        visible: false,
        dirty: false
    };

    $scope.template = "cache.html";

    $scope._messageService = MessageService;

    $scope.$watch('_messageService.messages.globals.load_success', setGlobals);
    $scope.$watch('_messageService.messages.globals.add_success', setGlobals);
    $scope.$watch('_messageService.messages.globals.update_success', setGlobals);
    $scope.$on('dss.global', setTemplate);

    $scope.$watch('editareaBinds.save', function(save) {
        if(save) {
            $scope.globals = $scope.editareaBinds.editareaValue;
            $scope.save();
        }
    }, true);

    $scope.$watch('globals', function() {
            $scope.editareaBinds.editareaValue = $scope.globals;
        }, true
    );

    $scope.$watch('globals_form.$valid', function(formValid) {
        if(formValid) {
            $('#globals_form_save').addClass('btn-success');
        } else {
            $('#globals_form_save').removeClass('btn-success');
        }
    });

    $(window).on('beforeunload', function() {
        if($scope.globals_form.$dirty || $scope.editareaBinds.dirty) {
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
        if(angular.isDefined($scope.services.data[service].active) && $scope.services.data[service].active) {
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

function MapproxyServicesCtrl($scope, localize, MapproxyServices, DataShareService, MessageService, ProjectDefaults) {
    var setServices = function() {
        var services = MapproxyServices.list();
        if(services.length > 0) {
            $scope.services = $.extend(true, $scope.services, services[0]);
            DataShareService.data('services', $scope.services);
        }
    };

    var setTemplate = function() {
        $scope.template = DataShareService.data('service');
    };

    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        MapproxyServices.add($scope.services);
    };

    $scope.services = {'data': {
        'wms': {},
        'wmts': {},
        'tms': {},
        'kml': {},
        'demo': {}
    }};

    DataShareService.data('services', $scope.services);

    $scope.template = 'wms.html'

    $scope._messageService = MessageService

    $scope.$watch('_messageService.messages.services.load_success', setServices);
    $scope.$watch('_messageService.messages.services.add_success', function() {
        $scope.services_form.$setPristine();
        setServices();
    });
    $scope.$watch('_messageService.messages.services.update_success', function() {
        $scope.services_form.$setPristine();
        setServices();
    });
    $scope.$watch('_messageService.messages.defaults.load_success', function() {
        var defaults = ProjectDefaults.list();
        if(defaults.length > 0) {
            $scope.defaults = defaults[0];
        }
    });
    $scope.$on('dss.service', setTemplate);

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
        if(angular.isDefined($scope.watch_source) &&
            angular.isDefined($scope.watch_source.data.req) &&
           angular.isDefined($scope.watch_source.data.supported_formats) &&
           $scope.watch_source.data.req.transparent == true) {
            var found = false;
            var non_transparent_formats = ['JPEG', 'GIF'];
            angular.forEach($scope.watch_source.data.supported_formats, function(format) {
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
        if(angular.isDefined($scope.watch_source) &&
            angular.isDefined($scope.watch_source.data.concurrent_requests) &&
           $scope.watch_source.data.concurrent_requests > 4) {
            $scope.high_number_of_concurrent_requests = true;
        } else {
            $scope.high_number_of_concurrent_requests = false;
        }
    }

    $scope.$watch('watch_source.data.supported_formats', checkImageSettings)
    $scope.$watch('watch_source.data.req.transparent', checkImageSettings)
    $scope.$watch('watch_source.data.concurrent_requests', checkConcurrentRequests)

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

function ProjectDefaultsCtrl($scope, ProjectDefaults, MessageService) {
    var setDefaults = function() {
        var defaults = ProjectDefaults.list();
        if(defaults.length > 0) {
            $scope.defaults = $.extend($scope.defaults, defaults[0]);
        }
    };
    $scope.save = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.defaults = clearData($scope.defaults);
        ProjectDefaults.add($scope.defaults);
        $scope.defaults_form.$setPristine();
    };
    $scope.addSRS = function(event) {
        if(angular.isDefined(event)) {
            event.preventDefault();
        }
        $scope.defaults.data.srs.push($scope.custom.newSRS);
        $scope.custom.newSRS = undefined;
    };
    $scope.removeSRS = function(event, srs) {
        var srsID = $.inArray(srs, $scope.defaults.data.srs);
        if(srsID !== -1) {
            $scope.defaults.data.srs.splice(srsID, 1);
        }
    }

    $scope._messageService = MessageService;

    $scope.defaults = {'data': {'srs': []}};
    $scope.custom = {};
    $scope.custom.newSRS;

    $scope.$watch('_messageService.messages.defaults.load_success', setDefaults);
    $scope.$watch('_messageService.messages.defaults.add_success', setDefaults);
    $scope.$watch('_messageService.messages.defaults.update_success', setDefaults);

    $(window).on('beforeunload', function() {
        if($scope.defaults_form.$dirty) {
            return localize.getLocalizedString(PAGE_LEAVE_MSG);
        }
    });
};
