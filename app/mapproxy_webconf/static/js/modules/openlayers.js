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
                activateDrawControlHandler: function() {

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
            var prepareLayerSwitcher = function() {
                $scope.rasterOverlays = [];

                angular.forEach($scope.layers, function(layer) {
                    if(layer.displayInLayerSwitcher) {
                        $scope.rasterOverlays.push(layer);
                    }
                });
                loadLayerSwitcherTemplate($scope);
            };

            //Toolbar
            var initToolbar = function() {
                $scope.toolbar = new OpenLayers.Control.Panel({
                    'displayClass': 'customEditingToolbar'
                });
                var _select = new OpenLayers.Control.SelectFeature($scope.drawLayer, {
                    displayClass: "olControlSelectFeature"
                });
                var _draw = undefined;

                switch($scope.drawLayer._allowedGeometry) {
                    case 'bbox':
                        _draw = new OpenLayers.Control.DrawFeature(
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
                var _modify = new OpenLayers.Control.ModifyFeature($scope.drawLayer, {
                    displayClass: "olControlModifyFeature",
                    mode: OpenLayers.Control.ModifyFeature.RESIZE |
                          OpenLayers.Control.ModifyFeature.DRAG
                });
                var _delete = new OpenLayers.Control.DeleteFeature($scope.drawLayer, {
                    displayClass: "olControlDeleteFeature",
                    selectControl: _select,
                    modifyControl: _modify
                });

                $scope.toolbar.addControls([_select, _draw, _modify, _delete]);
                $scope.map.addControl($scope.toolbar)

                if(angular.isDefined($scope.drawLayer._maxFeatures)) {
                    if($scope.drawLayer.features.length >= $scope.drawLayer._maxFeatures) {
                        OpenLayers.Element.addClass(_draw.panel_div, 'itemDisabled');
                        _draw._disabled = true;
                    }
                    var eventData = {
                        'drawLayer': $scope.drawLayer,
                        'drawControl': _draw
                    };
                    _draw.events.register(
                        'featureadded',
                        eventData,
                        eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    _draw.events.register(
                        'activate',
                        eventData,
                        eventHandlers.checkMaxFeaturesAfterAddOrActivate);
                    _delete.events.register(
                        'featuredeleted',
                        eventData,
                        eventHandlers.checkMaxFeaturesAfterDelete);
                }
            }

            //Layers
            var createBackgroundLayer = function(list, layer, srs) {
                var newLayer = new OpenLayers.Layer.WMS(layer.title, layer.url, {
                        srs: srs,
                        layers: [layer.name]
                    }, {
                        singleTile: true,
                        ratio: 1.0,
                        isBaseLayer: false
                });
                list.push(newLayer);
                $scope.mapLayers.push(newLayer);
            };
            var createWMSLayer = function(list, layer, srs, url) {
                if(layer.name || layer.layers) {
                    var newLayer = new OpenLayers.Layer.WMS(layer.title, url, {
                        srs: srs,
                        transparent: !layer.opaque,
                        layers: [layer.name]
                    }, {
                      singleTile: true,
                      ratio: 1.0
                    });
                    newLayer._layers = [];
                    angular.forEach(layer.layers, function(layer) {
                        createWMSLayer(newLayer._layers, layer, srs, url);
                    })
                    list.push(newLayer);
                    $scope.mapLayers.push(newLayer)
                }
            };
            var createVectorLayer = function(list, layer) {
                var newLayer = new OpenLayers.Layer.Vector(layer.name);
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
                list.push(newLayer);
                $scope.mapLayers.push(newLayer);
            };
            $scope.toggleVisibility = function(layer) {
                layer.setVisibility(!layer.visibility);
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
                $scope.layers = [];
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
                        createBackgroundLayer($scope.rasterBackgroundLayers, layer, $scope.olmapBinds.proj)
                    });
                }
                if(angular.isDefined($scope.olmapBinds.layers.wms)) {
                    angular.forEach($scope.olmapBinds.layers.wms, function(layer) {
                        createWMSLayer($scope.layers, layer, $scope.olmapBinds.proj, $scope.olmapBinds.url);
                    });
                }
                if(angular.isDefined($scope.olmapBinds.layers.vector)) {
                    angular.forEach($scope.olmapBinds.layers.vector, function(layer) {
                        createVectorLayer($scope.layers, layer);
                    });
                }

                $scope.map.addLayers($scope.mapLayers);

                if($attrs.mapToolbar && $scope.drawLayer) {
                    initToolbar();
                }
                if($attrs.mapLayerSwitcher) {
                    prepareLayerSwitcher($scope.map);
                }
                if(angular.isDefined($scope.dataExtent)) {
                    $scope.map.zoomToExtent($scope.dataExtent)
                } else {
                    $scope.map.zoomToMaxExtent();
                }
            };
            $scope.destroyMap = function() {
                if($scope.map instanceof OpenLayers.Map) {
                    $scope.map.destroy();
                    delete $scope.map;
                }
                $scope.layerSwitcherMaximized = false;
                $scope.dataExtent = undefined;
                $scope.mapLayers = [];
                $scope.layers = [];
                $scope.rasterBackgroundLayers = [];
                $scope.rasterOverlays = [];
                $scope.drawLayer = undefined;
                $.unblockUI();
                $scope.olmapBinds.visible = false;
            };

            //Directive initialization
            $scope.olmapBinds = {
                visible: $attrs.MapHidden || false,
                extent: undefined,
                proj: undefined,
                layers: undefined
            };
            $scope.rasterBackgroundLayers = [];
            $scope.mapLayers = [];
            $scope.layers = [];
            $scope.rasterOverlays = [];
            $scope.drawLayer = [];

            $scope.$watch('olmapBinds.visible', function(visible) {
                console.log('called')
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
            }, true);
        },
        link: function(scope, element, attrs) {
            scope.mapId = 'ol_map_' + scope.$id;
            //setup map element and add to element
            var mapElement = $('<div></div>')
                .attr('id', scope.mapId)
                .css('width', attrs.mapWidth)
                .css('height', attrs.mapHeight);

            var closeButton = angular.element('<i ng-click="destroyMap()"></i>')
                .addClass('icon-remove map-icon-remove');
            $compile(closeButton)(scope);

            mapElement.append(closeButton);
            element.append(mapElement);

            if(!scope.olmapBinds.visible) {
                $(element).hide();
            }
        }
    }
});
