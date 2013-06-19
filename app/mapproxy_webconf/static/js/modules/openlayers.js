angular.module('mapproxy_gui.openlayers', []).

//Default OpenLayers vector style
//OpenLayers.Feature.Vector.style
constant('DEFAULT_VECTOR_STYLING', {
    'default': {
        fillColor: "#ee9900",
        fillOpacity: 0.4,
        hoverFillColor: "white",
        hoverFillOpacity: 0.8,
        strokeColor: "#ee9900",
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
        fontColor: "#000000",
        labelAlign: "cm",
        labelOutlineColor: "white",
        labelOutlineWidth: 3
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

directive('olMap', function($compile, $http, $templateCache, $rootScope, $timeout, DEFAULT_VECTOR_STYLING, TRANSFORM_BBOX_URL) {
    return {
        restrict: 'A',
        scope: {
            olmapBinds: '=olMap'
        },
        transclude: true,
        templateUrl: '/static/angular_templates/openlayersmap.html',
        controller: function($scope, $element, $attrs) {
            $scope.eventHandlers = {
                checkMaxFeaturesAfterAddOrActivate: function() {
                    if(this.drawControl._disabled) {
                        this.drawControl.deactivate();
                    } else if(this.drawLayer.features.length >= this.drawLayer._maxFeatures) {
                        this.drawControl.deactivate();
                        OpenLayers.Element.addClass(this.drawControl.panel_div, 'itemDisabled');
                        this.drawControl._disabled = true;
                    }
                },
                checkMaxFeaturesAfterDelete: function() {
                    if(this.drawLayer.features.length < this.drawLayer._maxFeatures) {
                        OpenLayers.Element.removeClass(this.drawControl.panel_div, 'itemDisabled');
                        this.drawControl._disabled = false;
                    }
                },
                noticeChanges: function() {
                    $scope.unsavedChanges = true;
                    safeApply($scope)
                },
                updateMapScaleResolution: function() {
                    var value = $scope.showScale ? $scope.map.getScale() : $scope.map.getResolution();
                    $($scope.map.div).find('._mapScaleResolution .copyArea').html(value);
                }
            };

            //LayerSwitcher
            var loadLayerSwitcherTemplate = function() {
                var layerSwitcherTemplate = $templateCache.get("layerswitcher_template");
                if(angular.isUndefined(layerSwitcherTemplate)) {
                    $http.get('/static/angular_templates/layerswitcher.html').success(function(layerSwitcherTemplate) {
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
                $scope._select = new OpenLayers.Control.SelectFeature($scope.drawLayer, {
                    displayClass: "olControlSelectFeature"
                });
                $scope._draw = undefined;

                switch($scope.drawLayer._allowedGeometry) {
                    case 'bbox':
                        $scope._draw = new OpenLayers.Control.DrawFeature(
                            $scope.drawLayer,
                            OpenLayers.Handler.RegularPolygon, {
                                displayClass: "olControlDrawFeatureRect",
                                handlerOptions: {
                                    sides: 4,
                                    irregular: true
                                }
                            }
                        );
                        break;
                }
                $scope._modify = new OpenLayers.Control.ModifyFeature($scope.drawLayer, {
                    displayClass: "olControlModifyFeature",
                    mode: OpenLayers.Control.ModifyFeature.RESIZE |
                          OpenLayers.Control.ModifyFeature.DRAG |
                          OpenLayers.Control.ModifyFeature.RESHAPE
                });
                $scope._delete = new OpenLayers.Control.DeleteFeature($scope.drawLayer, {
                    displayClass: "olControlDeleteFeature",
                    selectControl: $scope._select,
                    modifyControl: $scope._modify
                });

                $scope.toolbar.addControls([$scope._select, $scope._draw, $scope._modify, $scope._delete]);
                $scope.map.addControl($scope.toolbar)

                if(angular.isDefined($scope.drawLayer._maxFeatures)) {
                    if($scope.drawLayer.features.length >= $scope.drawLayer._maxFeatures) {
                        OpenLayers.Element.addClass($scope._draw.panel_div, 'itemDisabled');
                        $scope._draw._disabled = true;
                    }
                    var eventData = {
                        'drawLayer': $scope.drawLayer,
                        'drawControl': $scope._draw,
                        'scope': $scope
                    };
                    $scope._draw.events.register(
                        'featureadded',
                        eventData,
                        $scope.eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    $scope._draw.events.register(
                        'activate',
                        eventData,
                        $scope.eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    $scope._delete.events.register(
                        'featuredeleted',
                        eventData,
                        $scope.eventHandlers.checkMaxFeaturesAfterDelete);
                }
                $scope.drawLayer.events.register(
                    'featureadded',
                    null,
                    $scope.eventHandlers.noticeChanges);
                $scope._delete.events.register(
                    'featuredeleted',
                    null,
                    $scope.eventHandlers.noticeChanges);
                $scope.drawLayer.events.register(
                    'featuremodified',
                    null,
                    $scope.eventHandlers.noticeChanges);
            };

            //Layers
            var createBackgroundLayer = function(layer, srs) {
                var newLayer = new OpenLayers.Layer.WMS(layer.title, layer.url, {
                        srs: srs,
                        layers: [layer.name]
                    }, {
                        singleTile: true,
                        ratio: 1.0,
                        isBaseLayer: false
                });
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

                if(!angular.isDefined(options.styleMap)) {
                    options.styleMap = new OpenLayers.StyleMap($.extend(true,
                        {}, DEFAULT_VECTOR_STYLING, layer.style
                    ));
                }

                var newLayer = new OpenLayers.Layer.Vector(layer.name, options);

                if(angular.isDefined(layer.geometries)) {
                    angular.forEach(layer.geometries, function(geometry) {
                        switch(geometry.type) {
                            case 'bbox':
                                var bbox = new OpenLayers.Bounds(geometry.coordinates);
                                var feature = new OpenLayers.Feature.Vector(bbox.toGeometry());
                                newLayer.addFeatures([feature]);
                                break;
                        }
                    })
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

                if(angular.isUndefined($scope.olmapBinds.extent) && $scope.olmapBinds.proj.getCode() != 'EPSG:4326') {
                    $http.post(TRANSFORM_BBOX_URL, {
                        "bbox": [-180, -90, 180, 90],
                        "sourceSRS": "EPSG:4326",
                        "destSRS": $scope.olmapBinds.proj.getCode()
                    }).success(function(response) {
                        $scope.olmapBinds.extent = new OpenLayers.Bounds(response.result);
                        createMap();
                    });
                } else {
                    if(!($scope.olmapBinds.extent instanceof OpenLayers.Bounds)) {
                        $scope.olmapBinds.extent = new OpenLayers.Bounds($scope.olmapBinds.extent || [-180, -90, 180, 90]);
                    }
                    createMap();
                }
            };
            var createMap = function() {
                if($scope.map instanceof OpenLayers.Map) {
                    $scope.map.destroy();
                    delete $scope.map;
                }

                if($scope.olmapBinds.showScaleRes && $scope.olmapBinds.dpi) {
                    OpenLayers.DOTS_PER_INCH = $scope.olmapBinds.dpi;
                } else {
                    OpenLayers.DOTS_PER_INCH = 72;
                }

                $scope.map = new OpenLayers.Map($scope.mapId, {
                    projection: $scope.olmapBinds.proj,
                    maxExtent: $scope.olmapBinds.extent,
                    units: $scope.olmapBinds.proj.units,
                    controls: [
                        new OpenLayers.Control.Navigation({
                            documentDrag: true,
                            dragPanOptions: {
                                interval: 1,
                                enableKinetic: true
                            }
                        }),
                        new OpenLayers.Control.PanZoomBar({autoActivate: true})
                    ],
                    layers: $scope.mapLayers
                });

                var imageLayer = new OpenLayers.Layer.Image('Blank',
                    OpenLayers.ImgPath+'/blank.gif',
                    $scope.olmapBinds.extent,
                    new OpenLayers.Size(500, 500), {
                        isBaseLayer: true,
                        displayInLayerSwitcher: false
                    }
                );
                $scope.map.addLayer(imageLayer);

                if($scope.olmapBinds.showScaleRes) {
                    $scope.eventHandlers.updateMapScaleResolution();
                    $scope.map.events.register('zoomend', null, $scope.eventHandlers.updateMapScaleResolution);
                }

                if($attrs.mapToolbar && $scope.drawLayer) {
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
            $scope.destroyMap = function(saveChanges) {
                if(angular.isDefined($scope._draw)) {
                    $scope._draw.deactivate()
                }
                if(angular.isDefined($scope._modify)) {
                    $scope._modify.deactivate();
                }
                if(saveChanges) {
                    var newGeometries = [];
                    angular.forEach($scope.drawLayer.features, function(feature) {
                        var geometry = feature.geometry.bounds.toArray();
                        newGeometries.push({
                            'type': $scope.drawLayer._allowedGeometry,
                            'coordinates': geometry
                        });
                    });

                    angular.forEach($scope.olmapBinds.layers.vector, function(layer) {
                        if(layer.name == $scope.drawLayer.name) {
                            layer.geometries = newGeometries;
                        }
                    })
                }
                if(angular.isDefined($scope.extensions.destroy)) {
                    angular.forEach($scope.extensions.destroy, function(func) {
                        func($scope.map);
                    });
                }
                if($scope.map instanceof OpenLayers.Map) {
                    $scope.map.destroy();
                    delete $scope.map;
                }
                $scope.layerSwitcherMaximized = false;
                $scope.dataExtent = undefined;
                $scope.mapLayers = [];
                $scope.drawLayer = undefined;
                $.unblockUI();
                $scope.olmapBinds.visible = false;

                safeApply($scope);
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
            $scope.showScale = true;

            $scope.$watch('olmapBinds.visible', function(visible) {
                if(visible) {
                    prepareMap();
                    $.blockUI({
                        message: $($element),
                        css: {
                            top:  ($(window).height() - $attrs.mapHeight) /2 + 'px',
                            left: ($(window).width() - $attrs.mapWidth) /2 + 'px',
                            width: $attrs.mapWidth
                        }
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
            scope.mapId = 'ol_map_' + scope.$id;
            //setup map element
            element.find('#_olmapTemp')
                .attr('id', scope.mapId)
                .css('width', attrs.mapWidth)
                .css('height', attrs.mapHeight);

            if(!scope.olmapBinds.visible) {
                $(element).hide();
            }
        }
    }
}).


directive('olGridExtension', function(TRANSFORM_GRID_URL, DEFAULT_VECTOR_STYLING) {
    return {
        restrict: 'A',
        require: '^olMap',
        transclude: false,
        scope: {
            olGridData: '=olGridExtension'
        },
        controller: function($scope, $element, $attrs) {
            // check why range-filter not work
            $scope.levels = function() {
                var levels = [];
                for(var i = 0; i < $scope.maxLevel; i++) {
                    levels.push(i);
                }
                return levels;
            }
            $scope.updateLevel = function() {
                $scope.layer.olLayer.protocol.params.level = $scope.gridLevel;
                $scope.layer.olLayer.strategies[0].update({force: true});
            }
            $scope._layer = {
                'name': 'Coverage'
            };
            $scope.gridLevel = 0;
            $scope.maxLevel = 20;
        },
        link: function(scope, element, attrs, olMapCtrl) {
            olMapCtrl.registerExtension('layers', function() {
                scope.layer = angular.copy(scope._layer);
                var gridData = scope.olGridData();

                if(angular.isDefined(gridData.res) && angular.isArray(gridData.res) && gridData.res.length > 0) {
                    scope.maxLevel = gridData.res.length;
                } else if(angular.isDefined(gridData.scales) && angular.isArray(gridData.scales) && gridData.scales.length > 0) {
                    scope.maxLevel = gridData.scales.length;
                } else {
                    scope.maxLevel = 20;
                }

                var options = {
                    protocol: new OpenLayers.Protocol.HTTP({
                        url: TRANSFORM_GRID_URL,
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
                        "default": new OpenLayers.Style($.extend(true, {}, DEFAULT_VECTOR_STYLING['default'], {
                            'fillOpacity': 0.25,
                            'fillColor': '#bbb',
                            'strokeColor': '#999',
                            'fontColor': '#777',
                            'pointRadius': 0,
                            'labelOutlineWidth': 0
                        }), {
                        rules: [
                            new OpenLayers.Rule({
                                filter: new OpenLayers.Filter.Function({
                                    evaluate: function(attrs) {
                                        return angular.isDefined(attrs.x) && angular.isDefined(attrs.y) && angular.isDefined(attrs.z);
                                }}),
                                symbolizer: {
                                    'label': "${z} / ${x} / ${y}"
                                }
                            }),
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
                            })
                        ]})
                    }),
                };
                var olLayer = olMapCtrl.createVectorLayer(scope.layer, options);
                olLayer.events.register('added', null, function() {
                    this.protocol.params['map_srs'] = this.projection.getCode();
                });

                if(angular.isDefined(olMapCtrl.olmapBinds.layers.vector)) {
                    olMapCtrl.olmapBinds.layers.vector.push(scope.layer);
                } else {
                    olMapCtrl.olmapBinds.layers.vector = [scope.layer];
                }
            });

            olMapCtrl.registerExtension('map', function(map) {
                map.events.register('zoomend', null, function() {
                    scope.updateLevel();
                });
                $(map.div).find('.olMapViewport').append(element);
            });

            olMapCtrl.registerExtension('destroy', function(map) {
                scope.gridLevel = 0;
                scope.maxLevel = 20;
                var layerList = olMapCtrl.olmapBinds.layers.vector;
                var layerIdx = layerList.indexOf(scope.layer);
                layerList.splice(layerIdx, 1)
                delete scope.layer;
            });
        }
    }
});
