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

directive('olMap', function($compile, $http, $templateCache, $rootScope, DEFAULT_VECTOR_STYLING) {
    return {
        restrict: 'A',
        scope: {
            olmapBinds: '=olMap'
        },
        transclude: true,
        templateUrl: '/static/angular_templates/openlayersmap.html',
        controller: function($scope, $element, $attrs) {
            var eventHandlers = {
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
                }
            }
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
                          OpenLayers.Control.ModifyFeature.DRAG
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
                        eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    $scope._draw.events.register(
                        'activate',
                        eventData,
                        eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    $scope._delete.events.register(
                        'featuredeleted',
                        eventData,
                        eventHandlers.checkMaxFeaturesAfterDelete);
                }
                $scope.drawLayer.events.register(
                    'featureadded',
                    null,
                    eventHandlers.noticeChanges);
                $scope._delete.events.register(
                    'featuredeleted',
                    null,
                    eventHandlers.noticeChanges);
                $scope.drawLayer.events.register(
                    'featuremodified',
                    null,
                    eventHandlers.noticeChanges);
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
                layer.olLayerId = newLayer.id;
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
                    layer.olLayerId = newLayer.id;
                    layer.visibility = true;
                    $scope.mapLayers.push(newLayer);
                    return newLayer;
                }
            };
            var createCombinedWMSLayer = function(layers, srs, url) {
                var names = [];
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
                    extractLayerNames(names, layer)
                });
                $scope.combinedLayer = createWMSLayer({'name': names, 'title': 'Combined Layer'}, srs, url);
            };
            var createVectorLayer = function(layer, name) {
                var newLayer = new OpenLayers.Layer.Vector(name);
                var style = $.extend({}, DEFAULT_VECTOR_STYLING, layer.style);
                newLayer.styleMap = new OpenLayers.StyleMap(style);
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
                layer.olLayerId = newLayer.id;
                layer.visibility = true;
                layer.name = name;
                layer.title = name;
                $scope.mapLayers.push(newLayer);
            };
            $scope.toggleVisibility = function(layer) {
                if($scope.olmapBinds.singleWMSRequest) {
                    if(layer.visibility) {
                        layer.visibility = false;
                        $scope.combinedLayer.params.LAYERS.splice(layer.layerSwitcherIdx, 1);

                    } else {
                        layer.visibility = true;
                        $scope.combinedLayer.params.LAYERS.splice(layer.layerSwitcherIdx, 0, layer.name);
                    }
                    $scope.combinedLayer.redraw();
                } else {
                    var olLayer = $scope.map.getLayersBy('id', layer.olLayerId)[0]
                    layer.visibility = !layer.visibility;
                    olLayer.setVisibility(layer.visibility);
                }
            };

            //Map
            var prepareMapParameters = function() {
                if(!($scope.olmapBinds.proj instanceof OpenLayers.Projection)) {
                    $scope.olmapBinds.proj = new OpenLayers.Projection($scope.olmapBinds.proj);
                }

                if(angular.isUndefined($scope.olmapBinds.extent) && $scope.olmapBinds.proj.getCode() != 'EPSG:4326') {
                    $http.post($rootScope.TRANSFORM_BBOX_URL, {
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
                $scope.mapLayers = [];

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
                    ]
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
                        createVectorLayer(layer, name);
                    });
                }

                $scope.map.addLayers($scope.mapLayers);

                if($attrs.mapToolbar && $scope.drawLayer) {
                    initToolbar();
                }
                if($attrs.mapLayerSwitcher) {
                    loadLayerSwitcherTemplate();
                    //prepareLayerSwitcher($scope.map);
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

                    safeApply($scope, function() {
                        $scope.olmapBinds.layers.vector[$scope.drawLayer.name].geometries = newGeometries;
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

            //Directive initialization
            $scope.olmapBinds = {
                visible: $attrs.MapHidden || false,
                extent: undefined,
                proj: undefined,
                layers: undefined
            };
            $scope.mapLayers = [];
            $scope.drawLayer = [];

            $scope.$watch('olmapBinds.visible', function(visible) {
                if(visible) {
                    prepareMapParameters();
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
});
