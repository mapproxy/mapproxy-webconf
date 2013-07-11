angular.module('mapproxy_gui.openlayers', []).

//Default OpenLayers vector style
//OpenLayers.Feature.Vector.style
constant('DEFAULT_VECTOR_STYLING', {
    'default': {
        fillColor: "#bbb",
        fillOpacity: 0.25,
        hoverFillColor: "white",
        hoverFillOpacity: 0.8,
        strokeColor: "#777",
        strokeOpacity: 1,
        strokeWidth: 1,
        strokeLinecap: "round",
        strokeDashstyle: "solid",
        hoverStrokeColor: "red",
        hoverStrokeOpacity: 1,
        hoverStrokeWidth: 0.2,
        pointRadius: 6,
        hoverPointRadius: 1,
        hoverPointUnit: "%",
        pointerEvents: "visiblePainted",
        cursor: "inherit",
        fontColor: "#555",
        labelAlign: "cm",
        labelOutlineColor: "white",
        labelOutlineWidth: 0
    },
    'select': {
        fillColor: "blue",
        fillOpacity: 0.4,
        hoverFillColor: "white",
        hoverFillOpacity: 0.8,
        strokeColor: "blue",
        strokeOpacity: 1,
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeDashstyle: "solid",
        hoverStrokeColor: "red",
        hoverStrokeOpacity: 1,
        hoverStrokeWidth: 0.2,
        pointRadius: 6,
        hoverPointRadius: 1,
        hoverPointUnit: "%",
        pointerEvents: "visiblePainted",
        cursor: "pointer",
        fontColor: "#000000",
        labelAlign: "cm",
        labelOutlineColor: "white",
        labelOutlineWidth: 3

    },
    'temporary': {
        fillColor: "#66cccc",
        fillOpacity: 0.2,
        hoverFillColor: "white",
        hoverFillOpacity: 0.8,
        strokeColor: "#66cccc",
        strokeOpacity: 1,
        strokeLinecap: "round",
        strokeWidth: 2,
        strokeDashstyle: "solid",
        hoverStrokeColor: "red",
        hoverStrokeOpacity: 1,
        hoverStrokeWidth: 0.2,
        pointRadius: 6,
        hoverPointRadius: 1,
        hoverPointUnit: "%",
        pointerEvents: "visiblePainted",
        cursor: "inherit",
        fontColor: "#000000",
        labelAlign: "cm",
        labelOutlineColor: "white",
        labelOutlineWidth: 3

    },
    'delete': {
        display: "none"
    }
}).

constant('GEOMETRY_TYPES', {
    'RECT': 'rect',
    'BBOX': 'bbox',
    'POLYGON': 'Polygon',
    'MULTIPOLYGON': 'MultiPolygon'
}).

directive('olMap', function($compile, $http, $templateCache, $rootScope, $timeout, DEFAULT_VECTOR_STYLING, OPENLAYERSMAP_TEMPLATE_URL, LAYERSWITCHER_TEMPLATE_URL, DPI, NUM_ZOOM_LEVELS, GEOMETRY_TYPES) {
    return {
        restrict: 'A',
        scope: {
            olmapBinds: '=olMap'
        },
        transclude: true,
        templateUrl: OPENLAYERSMAP_TEMPLATE_URL,
        controller: function($scope, $element, $attrs) {
            $scope.eventHandlers = {
                updateMapScaleResolution: function() {
                    safeApply($scope, function() {
                        $scope.currentResolution = $scope.map.getResolution();
                        $scope.currentScale = $scope.map.getScale();
                        $scope.currentDPI = $scope.olmapBinds.dpi || DPI;
                    });
                }
            };

            //LayerSwitcher
            var loadLayerSwitcherTemplate = function() {
                var layerSwitcherTemplate = $templateCache.get("layerswitcher_template");
                if(angular.isUndefined(layerSwitcherTemplate)) {
                    $http.get(LAYERSWITCHER_TEMPLATE_URL).success(function(layerSwitcherTemplate) {
                        $templateCache.put('layerswitcher_template', layerSwitcherTemplate);
                        renderLayerSwitcher($compile(layerSwitcherTemplate)($scope));
                    });
                } else {
                    renderLayerSwitcher($compile(layerSwitcherTemplate)($scope));
                }
            };
            var renderLayerSwitcher = function(layerSwitcherElement) {
                $($scope.map.div).find('.olMapViewport').append(layerSwitcherElement);
            };
            $scope.toggleVisibility = function(layer) {
                if($scope.olmapBinds.singleWMSRequest) {
                    if(layer.visibility) {
                        layer.visibility = false;
                        $scope.combinedWMSLayerNames.splice(layer.layerSwitcherIdx, 1);
                        $scope.combinedWMSLayerNames.splice(layer.layerSwitcherIdx, 0, null);

                    } else {
                        layer.visibility = true;
                        $scope.combinedWMSLayerNames.splice(layer.layerSwitcherIdx, 1);
                        $scope.combinedWMSLayerNames.splice(layer.layerSwitcherIdx, 0, layer.name);
                    }
                    if($scope.redrawInProgress) {
                        $timeout.cancel($scope.redrawInProgress);
                    }
                    $scope.redrawInProgress = $timeout(function() {
                        $scope.combinedLayer.params.LAYERS = $.map($scope.combinedWMSLayerNames, function(name) {
                            if(name != null) {
                                return name;
                            }
                        });
                        $scope.combinedLayer.redraw();
                    }, 1000, false);
                } else {
                    layer.visibility = !layer.visibility;
                    layer.olLayer.setVisibility(layer.visibility);
                }
            };

            //Toolbar
            var initToolbar = function() {
                $scope.toolbar = new OpenLayers.Control.Panel({
                    'displayClass': 'customEditingToolbar'
                });

                angular.forEach($scope.extensions.toolbar, function(func) {
                    func($scope.toolbar);
                });

                $scope.map.addControl($scope.toolbar)
            };

            //Layers
            var createBackgroundLayer = function(layer, srs) {
                var newLayer = new OpenLayers.Layer.WMS(layer.title, layer.url, {
                        srs: srs,
                        layers: [layer.name]
                    }, {
                        singleTile: true,
                        ratio: 1.0,
                        isBaseLayer: layer.baseLayer || false
                });
                $scope.haveBaseLayer = $scope.haveBaseLayer || layer.baseLayer;
                layer.olLayer = newLayer;
                layer.visibility = true;

                $scope.mapLayers.push(newLayer);
            };
            var createWMSLayer = function(layer, srs, url) {
                if(layer.name || layer.layers) {
                    olLayers = angular.isArray(layer.name) ? layer.name : [layer.name];
                    var newLayer = new OpenLayers.Layer.WMS(layer.title, url, {
                        srs: srs,
                        transparent: !layer.opaque,
                        layers: olLayers
                    }, {
                      singleTile: true,
                      ratio: 1.0
                    });
                    angular.forEach(layer.layers, function(layer) {
                        createWMSLayer(layer, srs, url);
                    })
                    layer.olLayer = newLayer;
                    layer.visibility = true;
                    $scope.mapLayers.push(newLayer);
                    return newLayer;
                }
            };
            var createCombinedWMSLayer = function(layers, srs, url) {
                $scope.combinedWMSLayerNames = [];
                var extractLayerNames = function(names, layer) {
                    if(layer.name) {
                        names.push(layer.name)
                        layer.layerSwitcherIdx = $.inArray(layer.name, names)
                    }
                    if(layer.layers) {
                        angular.forEach(layer.layers, function(layer) {
                            extractLayerNames(names, layer)
                        });
                    }
                    if(layer.name || layer.layers) {
                        layer.visibility = true;
                    }
                };
                angular.forEach(layers, function(layer) {
                    extractLayerNames($scope.combinedWMSLayerNames, layer)
                });
                $scope.combinedLayer = createWMSLayer({'name': angular.copy($scope.combinedWMSLayerNames), 'title': 'Combined Layer'}, srs, url);
            };
            var createVectorLayer = function(layer, options) {
                options = options || {};
                var format = new OpenLayers.Format.GeoJSON();
                if(!angular.isDefined(options.styleMap)) {
                    options.styleMap = new OpenLayers.StyleMap($.extend(true,
                        {}, DEFAULT_VECTOR_STYLING, layer.style
                    ));
                }

                var newLayer = new OpenLayers.Layer.Vector(layer.name, options);

                if(angular.isDefined(layer.geometries)) {
                    var geometries = angular.isFunction(layer.geometries) ? layer.geometries() : layer.geometries;
                    angular.forEach(geometries, function(geometry) {
                        var feature = undefined;
                        switch(geometry['type']) {
                            case GEOMETRY_TYPES.BBOX:
                                var bbox = new OpenLayers.Bounds(geometry.coordinates);
                                feature = new OpenLayers.Feature.Vector(bbox.toGeometry());
                                feature._drawType = GEOMETRY_TYPES.RECT;
                                break;
                            case GEOMETRY_TYPES.POLYGON:
                            case GEOMETRY_TYPES.MULTIPOLYGON:
                                feature = format.read(geometry)[0];
                                feature._drawType = GEOMETRY_TYPES.POLYGON;
                                break;
                        }
                        if(angular.isDefined(feature)) {
                            newLayer.addFeatures([feature]);
                        }
                    });
                }
                if(layer.zoomToDataExtent) {
                    $scope.dataExtent = newLayer.getDataExtent();
                }
                if(layer.isDrawLayer) {
                    $scope.drawLayer = newLayer;
                    $scope.drawLayer._maxFeatures = layer.maxFeatures || false;
                    $scope.drawLayer._allowedGeometry = layer.allowedGeometry;
                }

                layer.olLayer = newLayer;
                layer.visibility = true;
                layer.title = layer.title || layer.name;
                $scope.mapLayers.push(newLayer);
                return newLayer;
            };

            //Map
            var prepareMap = function() {
                $scope.mapLayers = [];

                if(!($scope.olmapBinds.proj instanceof OpenLayers.Projection)) {
                    $scope.olmapBinds.proj = new OpenLayers.Projection($scope.olmapBinds.proj);
                }

                if(angular.isDefined($scope.olmapBinds.extent) && !($scope.olmapBinds.extent instanceof OpenLayers.Bounds)) {
                    $scope.olmapBinds.extent = new OpenLayers.Bounds($scope.olmapBinds.extent);
                }

                if(angular.isDefined($scope.olmapBinds.layers.background)) {
                    angular.forEach($scope.olmapBinds.layers.background, function(layer) {
                        createBackgroundLayer(layer, $scope.olmapBinds.proj)
                    });
                }
                if(angular.isDefined($scope.olmapBinds.layers.wms)) {
                    if($scope.olmapBinds.singleWMSRequest) {
                        createCombinedWMSLayer($scope.olmapBinds.layers.wms, $scope.olmapBinds.proj, $scope.olmapBinds.url);
                    } else {
                        angular.forEach($scope.olmapBinds.layers.wms, function(layer) {
                            createWMSLayer(layer, $scope.olmapBinds.proj, $scope.olmapBinds.url);
                        });
                    }
                }
                if(angular.isDefined($scope.olmapBinds.layers.vector)) {
                    angular.forEach($scope.olmapBinds.layers.vector, function(layer, name) {
                        createVectorLayer(layer);
                    });
                }
                if(angular.isDefined($scope.extensions.layers)) {
                    angular.forEach($scope.extensions.layers, function(func) {
                        func();
                    });
                }
                createMap();
            };
            var createMap = function() {
                if($scope.map instanceof OpenLayers.Map) {
                    $scope.map.destroy();
                    delete $scope.map;
                }

                if($scope.olmapBinds.showScaleRes && $scope.olmapBinds.dpi) {
                    OpenLayers.DOTS_PER_INCH = $scope.olmapBinds.dpi;
                } else {
                    OpenLayers.DOTS_PER_INCH = DPI;
                }
                var options = {
                    projection: $scope.olmapBinds.proj,
                    maxExtent: $scope.olmapBinds.extent,
                    units: $scope.olmapBinds.proj.units,
                    numZoomLevels: $scope.olmapBinds.numZoomLevels || NUM_ZOOM_LEVELS,
                    allOverlays: !$scope.haveBaseLayer,
                    theme: null,
                    controls: [
                        new OpenLayers.Control.Navigation({
                            documentDrag: true,
                            dragPanOptions: {
                                interval: 1,
                                enableKinetic: true
                            }
                        }),
                        new OpenLayers.Control.PanZoomBar({autoActivate: true})
                    ]
                }
                $scope.map = new OpenLayers.Map($scope.mapId, options);
                $scope.map.addLayers($scope.mapLayers);

                if($scope.olmapBinds.showScaleRes) {
                    $scope.eventHandlers.updateMapScaleResolution();
                    $scope.map.events.register('zoomend', null, $scope.eventHandlers.updateMapScaleResolution);
                }

                if(angular.isDefined($scope.extensions.toolbar)) {
                    initToolbar();
                }
                if($attrs.mapLayerSwitcher) {
                    loadLayerSwitcherTemplate();
                }
                if(angular.isDefined($scope.extensions.map)) {
                    angular.forEach($scope.extensions.map, function(func) {
                        func($scope.map);
                    });
                }
                if(angular.isDefined($scope.dataExtent)) {
                    $scope.map.zoomToExtent($scope.dataExtent)
                } else {
                    $scope.map.zoomToMaxExtent();
                }
            };
            $scope.destroyMap = function() {
                if(angular.isDefined($scope.extensions.destroy)) {
                    angular.forEach($scope.extensions.destroy, function(func) {
                        func($scope.map);
                    });
                }
                if($scope.map instanceof OpenLayers.Map) {
                    $scope.map.destroy();
                    delete $scope.map;
                }

                safeApply($scope, function() {
                    $scope.layerSwitcherMaximized = false;
                    $scope.dataExtent = undefined;
                    $scope.mapLayers = [];
                    $scope.drawLayer = undefined;
                    $scope.olmapBinds.visible = false;
                });
            };

            var registerExtension = function(type, func) {
                if(angular.isDefined($scope.extensions[type])) {
                    $scope.extensions[type].push(func);
                } else {
                    $scope.extensions[type] = [func];
                }
            }

            //Directive initialization
            $scope.extensions = {};
            $scope.olmapBinds = $.extend(true, {
                visible: $attrs.MapHidden || false,
                extent: undefined,
                proj: undefined,
                layers: undefined
            }, $scope.olmapBinds);

            $scope.mapLayers = [];
            $scope.drawLayer = [];

            $scope.$watch('olmapBinds.visible', function(visible) {
                if(visible) {
                    marginWidth = 200;
                    marginHeight = marginWidth;
                    // set size of map
                    if(!$scope.hasSize) {
                        $("#"+$scope.mapId)
                            .css('width', $(window).width() - marginWidth)
                            .css('height', $(window).height() - marginHeight);

                        // set new size after resizing window
                        $(window).resize(function() {
                            $("#"+$scope.mapId)
                                .css('width', $(window).width() - marginWidth)
                                .css('height', $(window).height() - marginHeight);
                        });
                    }

                    prepareMap();

                    $($element).dialog({
                        width:'auto',
                        modal: true,
                        title: $scope.olmapBinds.title,
                        close: $scope.destroyMap
                    });
                }
            });

            return {
                createVectorLayer: createVectorLayer,
                registerExtension: registerExtension,
                olmapBinds: $scope.olmapBinds
            };
        },
        link: function(scope, element, attrs) {
            scope.hasSize = false;
            scope.mapId = 'ol_map_' + scope.$id;
            //setup map element
            if (attrs.mapWidth && attrs.mapHeight) {
                scope.hasSize = true;
                element.find('#_olmapTemp')
                    .attr('id', scope.mapId)
                    .css('width', attrs.mapWidth)
                    .css('height', attrs.mapHeight);
            } else {
                element.find('#_olmapTemp')
                    .attr('id', scope.mapId)
            }


            if(!scope.olmapBinds.visible) {
                $(element).hide();
            }
        }
    }
}).

directive('olEditorExtension', function($parse, DEFAULT_VECTOR_STYLING, GEOMETRY_TYPES) {
    return {
        restrict: 'A',
        require: '^olMap',
        transclude: false,
        replace: true,
        scope: {
            olEditorData: '&olEditorExtension'
        },
        controller: function($scope, $element, $attrs) {
            $scope.eventHandlers = {
                addType: function(f) {
                    f.feature._drawType = this.type;
                }
            };
            $scope.deleteTool = function(layer, selectControl, modifyControl) {
                var options = {
                    displayClass: "olControlDeleteFeature",
                    selectControl: selectControl,
                    modifyControl: modifyControl
                };
                var control = new OpenLayers.Control.DeleteFeature(layer, options);
                return control;
            };
            $scope.modifyTool = function(layer) {
                var options = {
                    displayClass: "olControlModifyFeature",
                    mode: OpenLayers.Control.ModifyFeature.RESIZE |
                          OpenLayers.Control.ModifyFeature.DRAG |
                          OpenLayers.Control.ModifyFeature.RESHAPE
                };
                var control = new OpenLayers.Control.ModifyFeature(layer, options);
                return control;
            };
            $scope.drawRectTool = function(layer) {
                var handler = OpenLayers.Handler.RegularPolygon;
                var handlerOptions = {
                    sides: 4,
                    irregular: true
                };
                var options = {
                    displayClass: "olControlDrawFeatureRect",
                    handlerOptions: handlerOptions
                };
                var control = new OpenLayers.Control.DrawFeature(layer, handler, options);
                control.events.register('featureadded', {'type': GEOMETRY_TYPES.RECT}, $scope.eventHandlers.addType)
                return control;
            };
            $scope.drawPolygonTool = function(layer) {
                var handler = OpenLayers.Handler.Polygon;
                var handlerOptions = {
                    // XXXholeModifier
                    // see ticket mg-130
                    // holeModifier: 'shiftKey',
                    // freehandToggle: null
                };
                var options = {
                    displayClass: "olControlDrawFeaturePolygon",
                    handlerOptions: handlerOptions
                };
                var control = new OpenLayers.Control.DrawFeature(layer, handler, options);
                control.events.register('featureadded', {'type': GEOMETRY_TYPES.POLYGON}, $scope.eventHandlers.addType)
                return control;
            };
            $scope.extractGeometry = function(layer) {
                var geometry = false;
                var format = new OpenLayers.Format.GeoJSON();
                var _drawType = false;
                var _bbox = false;
                if(layer.features.length == 1) {
                    geometry = layer.features[0].geometry.clone()
                    if(layer.features[0]._drawType == GEOMETRY_TYPES.RECT) {
                        _bbox = geometry.getBounds().toArray();
                    }
                    _drawType = layer.features[0]._drawType;
                } else if(layer.features.length > 1) {
                    var polygons = []
                    angular.forEach(layer.features, function(feature) {
                        polygons.push(feature.geometry.clone());
                    });
                    geometry = new OpenLayers.Geometry.MultiPolygon(polygons);
                    _drawType = GEOMETRY_TYPES.POLYGON;
                }
                if(geometry) {
                    return {
                        'type': _drawType,
                        'bbox': _bbox,
                        'geojson': format.write(geometry)
                    }
                }
                return false;
            }
        },
        link: function(scope, element, attrs, olMapCtrl) {
            olMapCtrl.registerExtension('layers', function() {
                var olEditorData = scope.olEditorData(scope, {})();
                olEditorData.layer['zoomToDataExtent'] = !isEmpty(olEditorData.layer.geometries());
                scope.drawLayer = olMapCtrl.createVectorLayer(olEditorData.layer, olEditorData.layerOptions);
            });

            olMapCtrl.registerExtension('toolbar', function(toolbar) {
                scope.modifyControl = scope.modifyTool(scope.drawLayer);
                scope.deleteControl = scope.deleteTool(scope.drawLayer, null, scope.modifyControl);
                scope.drawRectControl = scope.drawRectTool(scope.drawLayer);
                scope.drawPolygonControl = scope.drawPolygonTool(scope.drawLayer)
                toolbar.addControls([
                    scope.deleteControl,
                    scope.modifyControl,
                    scope.drawRectControl,
                    scope.drawPolygonControl
                ]);
            });

            olMapCtrl.registerExtension('destroy', function() {
                var olEditorData = scope.olEditorData(scope, {})();

                olEditorData.setResultGeometry(scope.extractGeometry(scope.drawLayer));

                scope.modifyControl.deactivate();
                scope.deleteControl.deactivate();
                scope.drawRectControl.deactivate();
                scope.drawPolygonControl.deactivate();
                scope.drawLayer.destroy();
                delete scope.drawLayer;
            });
        }
    };
}).

directive('olGridExtension', function($parse, GRID_AS_GEOJSON_URL, DEFAULT_VECTOR_STYLING, GRID_START_LEVEL, GRID_MAX_LEVEL, GRID_EXTENSION_TEMPLATE_URL) {
    return {
        restrict: 'A',
        require: '^olMap',
        transclude: false,
        repalce: true,
        templateUrl: GRID_EXTENSION_TEMPLATE_URL,
        scope: {
            olGridData: '&olGridExtension',
            olGridScales: '=olGridScales'
        },
        controller: function($scope, $element, $attrs) {
            $scope.preventDefaultsStopPropagation = function(event) {
                if(angular.isDefined(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            };
            $scope.levels = function() {
                var levels = [];
                for(var i = 0; i < $scope.maxLevel; i++) {
                    var level = {'level': i}
                    level['name'] = i;
                    if($scope.olGridScales) {
                        level['name'] += ' (1:' + $scope.olGridScales[i] + ')';
                    }
                    levels.push(level);
                }
                return levels;
            };
            $scope.updateLevel = function() {
                $scope.layer.olLayer.protocol.params.level = $scope.gridLevel;
                $scope.layer.olLayer.strategies[0].update({force: true});
            };
            $scope.toggleLabels = function() {
                var rules = $scope.layer.olLayer.styleMap.styles.default.rules;
                if($scope.showLabels) {
                    rules.splice(rules.indexOf($scope.pointLabelRule), 1)
                } else {
                    rules.push($scope.pointLabelRule)
                }
                $scope.showLabels = !$scope.showLabels;
                $scope.layer.olLayer.styleMap.styles.default.rules = rules;
                $scope.layer.olLayer.redraw()
            };
            $scope._layer = {
                'name': 'Coverage'
            };
            $scope.gridLevel = GRID_START_LEVEL;
            $scope.maxLevel = GRID_MAX_LEVEL;
            $scope.showLabels = true;
            $scope.pointLabelRule = new OpenLayers.Rule({
                filter: new OpenLayers.Filter.Function({
                    evaluate: function(attrs) {
                        return angular.isDefined(attrs.x) && angular.isDefined(attrs.y) && angular.isDefined(attrs.z);
                }}),
                symbolizer: {
                    'label': "${z}/${x}/${y}"
                }
            });
            $scope.eventHandlers = {
                zoomToGrid: function() {
                    this.map.zoomToExtent(this.getDataExtent());
                    this.events.unregister('featuresadded', null, $scope.eventHandlers.zoomToGrid);
                },
                addSRSToProtocol: function() {
                    this.protocol.params['map_srs'] = this.projection.getCode();
                }
            };
        },
        link: function(scope, element, attrs, olMapCtrl) {
            olMapCtrl.registerExtension('layers', function() {
                olMapCtrl.olmapBinds.numZoomLevels = scope.maxLevel;
                scope.layer = angular.copy(scope._layer);
                var gridData = scope.olGridData(scope, {})();

                if(angular.isDefined(gridData.res) && angular.isArray(gridData.res) && gridData.res.length > 0) {
                    scope.maxLevel = gridData.res.length;
                } else if(angular.isDefined(gridData.scales) && angular.isArray(gridData.scales) && gridData.scales.length > 0) {
                    scope.maxLevel = gridData.scales.length;
                } else {
                    scope.maxLevel = GRID_MAX_LEVEL;
                }

                var options = {
                    protocol: new OpenLayers.Protocol.HTTP({
                        url: GRID_AS_GEOJSON_URL,
                        readWithPOST: true,
                        updateWithPOST: true,
                        deleteWithPOST: true,
                        format: new OpenLayers.Format.GeoJSON(),
                        params: $.extend({}, gridData, {'level': scope.gridLevel})
                    }),
                    strategies: [
                        new OpenLayers.Strategy.BBOX({
                            ratio: 1
                    })],
                    styleMap: new OpenLayers.StyleMap({
                        "default": new OpenLayers.Style($.extend(true, {}, DEFAULT_VECTOR_STYLING['default'], {pointRadius: 0}), {
                        rules: [
                            new OpenLayers.Rule({
                                filter: new OpenLayers.Filter.Function({
                                    evaluate: function(attrs) {
                                        return angular.isDefined(attrs.message);
                                }}),
                                symbolizer: {
                                    'label': "${message}"
                                }
                            }),
                            new OpenLayers.Rule({
                                filter: new OpenLayers.Filter.Function({
                                    evaluate: function(attrs) {
                                        return (!(angular.isDefined(attrs.x) && angular.isDefined(attrs.y) && angular.isDefined(attrs.z)) && !angular.isDefined(attrs.message))
                                    }
                                })
                            }),
                            scope.pointLabelRule
                        ]})
                    }),
                };
                var olLayer = olMapCtrl.createVectorLayer(scope.layer, options);
                olLayer.events.register('added', null, scope.eventHandlers.addSRSToProtocol);
                olLayer.events.register('featuresadded', null, scope.eventHandlers.zoomToGrid);
            });

            olMapCtrl.registerExtension('map', function(map) {
                map.events.register('zoomend', null, function() {
                    scope.updateLevel();
                });
                $(map.div).find('.olMapViewport').append(element.first());
            });

            olMapCtrl.registerExtension('destroy', function(map) {
                scope.gridLevel = GRID_START_LEVEL;
                scope.maxLevel = GRID_MAX_LEVEL;

                delete scope.layer;
                delete scope.pointLayer;
            });
        }
    }
});
