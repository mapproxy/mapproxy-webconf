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
                    var olLayer = $scope.map.getLayersBy('id', layer.olLayerId)[0]
                    layer.visibility = !layer.visibility;
                    olLayer.setVisibility(layer.visibility);
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
            var createVectorLayer = function(layer) {
                var options = {};
                if(angular.isDefined(layer.url)) {
                    options = {
                        protocol: new OpenLayers.Protocol.HTTP({
                            url: layer.url,
                            readWithPOST: true,
                            updateWithPOST: true,
                            deleteWithPOST: true,
                            format: new OpenLayers.Format.GeoJSON(),
                            //headers.Content-Type is overwritten by
                            //OpenLayers.Protocol.HTTP:202
                            // headers: {
                            //     'Content-Type': 'application/json'
                            // },
                            //set additional parameter so srs is also send to server
                            params: {'srs': $scope.olmapBinds.proj}
                        }),
                        strategies: [
                            new OpenLayers.Strategy.BBOX({
                                ratio: 1
                            })
                    ]}
                }

                var newLayer = new OpenLayers.Layer.Vector(layer.name, options);
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
                layer.title = layer.title || layer.name;
                $scope.mapLayers.push(newLayer);
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

                    angular.forEach($scope.olmapBinds.layers.vector, function(layer) {
                        if(layer.name == $scope.drawLayer.name) {
                            layer.geometries = newGeometries;
                        }
                    })
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
