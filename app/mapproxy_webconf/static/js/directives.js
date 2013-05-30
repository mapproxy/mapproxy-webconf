/**
 * Makes a list sortable
 *
 * Example:
 * <ul sortable to-sort="layer_list">
 *     <li ng-repeat="item in sortable_array">{{item.name}}<button class="btn btn-mini btn-danger" style="float:right;" ng-click="remove(item)">X</button></li>
 * </ul>
 * <button ng-click="add()">Add</button>
 *
 * the add function defined in an sorounding controller:
 * $scope.add = function() {
 *     $scope.layer_list.push({"id": 99, "name": "New"});
 * }
 *
 * layer_list is a list of dicts
 * insiede the directive you must work with sortable_array
 * instead of the outer list layer_list
 *
 * if you wish to use functions inside the directive like
 * remove, they must be defined inside the directive
 *
 * ToDo:
 * figger out how to access methods of directive from
 * outside like add so the outer list layer_list hasn't
 * to manipulate by controller but by directive
 */

angular.module('mapproxy_gui.directives', ['localization']).
directive('sortable', function() {
    return {
        restrict: 'A',
        replace: false,
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelCtrl) {

            scope.dragStart = function(e, ui) {
                ui.item.data('start', ui.item.index());
            };

            scope.dragEnd = function(e, ui) {
                //old item list index
                var start = ui.item.data('start');
                //new item list index
                var end = ui.item.index();
                scope.items = ngModelCtrl.$modelValue;

                if(angular.isUndefined(scope.items)) {
                    scope.items = [];
                }
                //rearrange list
                scope.items.splice(end, 0,
                    scope.items.splice(start, 1)[0]);

                //tell angular $scope has changed
                scope.$apply(function() {
                    ngModelCtrl.$setValidity('required', true);
                });
            };

            scope.remove = function(item) {
                scope.items = ngModelCtrl.$modelValue;
                scope.items.splice(scope.items.indexOf(item), 1);
                if(scope.items.length == 0) {
                    ngModelCtrl.$setViewValue(undefined);
                    ngModelCtrl.$setValidity('required', false);
                }
            };

            $(element).sortable({
                start: scope.dragStart,
                update: scope.dragEnd,
                axis: "y"
            });
        }
    };
}).

/* Drag&Drop directives */
directive('draggable', function() {
    return {
        // A = attribute, E = Element, C = Class and M = HTML Comment
        restrict:'A',
        require: '?ngModel',
        scope: 'element',
        //The link function is responsible for registering DOM listeners as well as updating the DOM.
        link: function(scope, element, attrs, ngModelCtrl) {

            if(angular.isDefined(ngModelCtrl)) {
                scope.remove = function() {
                    var item = angular.fromJson(attrs.itemData);
                    var source_list = ngModelCtrl.$modelValue ? ngModelCtrl.$modelValue : [];
                    var found = false;
                    angular.forEach(source_list, function(source_item) {
                        if(!found) {
                            if(angular.equals(source_item, item)) {
                                source_list.splice(source_list.indexOf(source_item), 1);
                                found = true;
                            }
                        }
                    })
                    if(source_list.length == 0) {
                        ngModelCtrl.$setViewValue(undefined);
                    }
                };
            }

            $(element).draggable({
                helper: function( event ) {
                    var text = $(this).find('.droppable_name').text();
                    return $( "<div class='draggable-active'>"+ text +"</div>" );
                },
                cursor: 'move',
                revert: false
            });
        }
    };
}).

/**
 * Insertable directive
 *
 * Usable as attribute: <div insertable ...
 * requires ng-model
 *
 * change: function
 * - fired on value change.
 * - must provide a callback parameter for callback function
 * - callback(true) accept change
 * - callback(false) reject change
 *
 * allow-array: boolean
 * - true to allow insert arrays
 *
 * accepts: string - comma seppareted string for list
 * - classname(s) of elements allowed to insert
 *
 * use-key-for-value
 * - don't add whole object to model but add specific key of
 *   inserted object
 * - e.g.: {'foo': 1, 'bar': 2} with use-key-for-value="bar"
 *   will add 2 to model
 */
 //TODO: allow setting accepts
directive('droppable', function($parse) {
    return {
        restrict: 'A',
        require: 'ngModel',
        scope: 'element',
        link: function(scope, element, attrs, ngModelCtrl) {
            scope.checkExist = function(item) {
                if(angular.isArray(item)) {
                    angular.forEach(item, scope.checkExist);
                } else {
                    var exist = false;
                    if(scope.use_key) {
                        var keys = scope.use_key.split('.');
                        angular.forEach(keys, function(key) {
                            item = item[key];
                        });
                    }
                    if(angular.isObject(scope.items) || angular.isArray(scope.items)) {
                        //because angular add a unique $$hashKey to objects
                        angular.forEach(scope.items, function(scope_item) {
                            //angular.forEach doesn't support break
                            if(!exist) {
                                exist = angular.equals(scope_item, item);
                            }
                        });
                    } else {
                        exist = angular.equals(scope.items, item);
                    }
                    if(!exist) {
                        scope.to_insert.push(item);
                    }
                }
            };
            scope.insertItems = function() {
                if(angular.isUndefined(scope.items)) {
                    scope.items = [];
                }
                if(attrs.allowArray) {
                    scope.items = scope.items.concat(scope.to_insert);
                } else {
                    scope.items = scope.to_insert[0];
                }
                var insert_scope = angular.element(scope.j_ui).scope();
                if(angular.isFunction(insert_scope.remove)) {
                    insert_scope.remove();
                }
                delete(scope.j_ui);

                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(scope.items);
                    if(angular.isDefined(scope.items)) {
                        ngModelCtrl.$setValidity('required', true);
                    }
                    ngModelCtrl.$render();
                });
            };

            scope.remove = function(item) {
                scope.items = ngModelCtrl.$modelValue;
                if(angular.isUndefined(scope.items) || angular.isUndefined(item)) {
                    return;
                }
                if(attrs.allowArray) {
                    scope.items.splice(scope.items.indexOf(item), 1);
                    if(scope.items.length == 0) {
                        scope.items = undefined;
                    }
                } else {
                    scope.items = undefined;
                }

                ngModelCtrl.$setViewValue(scope.items);
                if(angular.isUndefined(scope.items)) {
                    ngModelCtrl.$setValidity('required', false);
                }
            };
            scope.insertCallback = function(insert) {
                if(insert) {
                    scope.items = ngModelCtrl.$modelValue;
                    scope.checkExist(scope.new_item);
                    if(scope.to_insert.length > 0) {
                        scope.insertItems();
                        return;
                    }
                }
                scope.j_ui.draggable('option', 'revert', true);

            };
            scope.changeCallback = function(change) {
                if(change) {
                    scope.insertItems();
                } else {
                    scope.j_ui.draggable('option', 'revert', true);
                }
            };
            scope.dropHandler = function(event,ui) {

                //get current items from model
                scope.items = ngModelCtrl.$modelValue;
                scope.inserted = false;
                scope.j_ui = $(ui.draggable);
                //only process draggable elements
                if(!scope.j_ui.hasClass('ui-draggable')) {
                    return;
                }

                //get data (string) of dopped element and convert it to an object
                scope.new_item = angular.fromJson(scope.j_ui.attr('item-data'));

                scope.to_insert = [];

                //check for data
                if(!angular.isUndefined(scope.new_item)) {
                    //run insert callback if present
                    if(angular.isFunction(scope.insert)) {
                        scope.insert(scope, {callback: scope.insertCallback, new_data: scope.new_item});
                    } else {
                        //check for existing items
                        scope.checkExist(scope.new_item);
                        //look if something to insert
                        if(scope.to_insert.length > 0) {
                            //run change callback if present
                            if(angular.isFunction(scope.change)) {
                                scope.change(scope, {callback: scope.changeCallback, new_data: scope.new_item});
                            } else {
                                scope.insertItems();
                            }
                        } else {
                            scope.j_ui.draggable('option', 'revert', true);
                        }
                    }
                }
            };
            scope.accepts = angular.isUndefined(attrs.accepts) ? [] : attrs.accepts.split(',');

            scope.use_key = attrs.useKeyForValue;

            //look for callback functions
            scope.change = angular.isUndefined(attrs.changeCallback) ? undefined : $parse(attrs.changeCallback);
            scope.insert = angular.isUndefined(attrs.insertCallback) ? undefined : $parse(attrs.insertCallback);

            var acceptClasses = [];
            angular.forEach(scope.accepts, function(acceptClass) {
                acceptClasses.push('.'+acceptClass);
            });

            $(element).droppable({
                accept: acceptClasses.toString(),
                activeClass: 'droppable-active',
                drop: scope.dropHandler,
                tolerance: 'touch'
            });
        }
    };
}).

directive('toggleGroup', function() {
    return {
        restrict: 'A',
        controller: toggleGroupCtrl
    };
}).

directive('toggleElement', function() {
    return {
        restrict: 'A',
        require: '^toggleGroup',
        link: function(scope, element, attrs, toggleGroupCTRL) {
            toggleGroupCTRL.addElement(element);
            $(element).click(function() {
                toggleGroupCTRL.getToggleFunc()(element, scope.$index);
            });
        }
    }
}).

directive('dialog', function($parse, localize) {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {
            scope.openDialog = function(event) {
                event.stopPropagation();
                var buttons = {};
                switch(attrs.dialog) {
                    case 'ask':
                        buttons[localize.getLocalizedString('Yes')] = function() {
                            $(this).dialog("close");
                            scope.callback(scope);
                        };
                        buttons[localize.getLocalizedString('No')] = function() {
                            $(this).dialog("close");
                        };
                        break;
                    case 'confirm':
                        buttons[localize.getLocalizedString('OK')] = function() {
                            $(this).dialog("close");
                        }
                        break;
                }
                scope.dialog.attr('title', attrs.dialogTitle);
                scope.dialog.find('p').html(attrs.dialogText);
                scope.dialog.dialog({
                    resizeable: false,
                    width: attrs.dialogWidth || 400,
                    height: attrs.dialogHeight || 200,
                    model: true,
                    buttons: buttons
                });
            };
            scope.dialog_id = scope.$id;
            scope.callback = $parse(attrs.callback);
            scope.dialog = $('<div style="display:none;" id="dialog_' + scope.dialog_id +'"><p></p></div>');
            element.after(scope.dialog);

            element.bind('click', scope.openDialog);
        }
    };
}).

/*
    labeled must point to existing template!
    labeled="[template]"
*/
directive('labeled', function($parse, $templateCache, localize) {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        template: function(element, attrs) {
            return $templateCache.get(attrs.labeled)
        },
        scope: 'element',
        link: function(scope, element, attrs) {

            scope.showWarning = function() {
                if(scope.warning) {
                    element.addClass('warning');
                    $('#tooltip_'+ scope.$id).tooltip({
                        placement: 'right',
                        title: scope.warningMsg
                    });
                    return true;
                } else {
                    element.removeClass('warning');
                    return false;
                }
            };
            scope.warningMsg = function() {
                return attrs.warningMsg;
            };
            scope.getText = function() {
                return attrs.text;
            };

            scope.name = attrs.nameFor;

            if(angular.isDefined(attrs.$attr.warning)) {
                scope.warning_msg = attrs.warningMsg;
                attrs.$observe('warning', function(val) {
                    scope.warning = val == 'true';
                });
            }
        }
    };
}).

directive('extendableInputList', function($timeout) {
    return {
        restrict: 'A',
        scope: {
            extendableInputListBinds: '=extendableInputList'
        },
        replace: true,
        transclude: true,
        template: '<ul>' +
                  '<div ng-repeat="item in extendableInputListBinds">' +
                  '<li>Level {{$index}}: <input class="_extendableInputListItem" float ng-blur="update()" ng-click="focusOn(this)" ng-model="items[$index]"></li>' +
                  '</div>' +
                  '<div><li>Level {{extendableInputListBinds.length}}: <input class="_extendableInputListItem" id="_extendableInputListNewInput" float ng-blur="blured=true;waitForFocus();" ng-change="showNext=true" ng-model="items[extendableInputListBinds.length]"></li></div>' +
                  '<div ng-show="showNext"><li>Level {{extendableInputListBinds.length + 1}}: <input class="_extendableInputListItem" float ng-focus="update()" ng-model="items[extendableInputListBinds.length + 1]"></li></div>',
        link: function(scope, element, attrs) {
            var focusElement = false;
            scope.items = [];
            scope.showNext = false;
            scope.blured = false;

            scope.waitForFocus = function() {
                $timeout(function() {
                    if(!$(':focus').hasClass('_extendableInputListItem')) {
                        scope.update(true);
                    }
                });
            }

            scope.focusOn = function(_element) {
                focusElement = _element;
                if(scope.blured) {
                    scope.blured = false;
                    scope.update();
                }
            };
            scope.update = function(updateOnly) {
                //added function to sort to sort numbers
                //found at http://www.w3schools.com/jsref/jsref_sort.asp
                if($.inArray(undefined, scope.items) == -1 && !angular.equals(scope.items, scope.extendableInputListBinds)) {
                    scope.extendableInputListBinds = angular.copy(scope.items.sort(
                        function(a, b) {
                            return a-b;
                    }).reverse());
                    scope.showNext = false;
                    if(focusElement && !updateOnly) {
                        $(focusElement).focus();
                        focusElement = false;
                    } else {
                        $(element).find('#_extendableInputListNewInput').focus();
                    }
                    safeApply(scope);
                }
            };
            scope.$watch('extendableInputListBinds', function(newVal) {
                if(!angular.equals(newVal, scope.items)) {
                    scope.items = angular.copy(scope.extendableInputListBinds);
                }
            })
        }
    };
}).

directive('editarea', function($http, MessageService) {
    return {
        restrict: 'A',
        scope: {
            editareaBinds: "=editarea"
        },
        replace: true,
        transclude: true,
        templateUrl: '/static/angular_templates/editarea.html',
        link: function(scope, element, attrs) {
            var _editareaElement = $(element).find('#_editarea');

            var tabwidth = attrs.tabwidth || 2;
            var indent = attrs.indent || 'spaces';
            var rows = attrs.rows || 25;
            var yamlURL = attrs.yamlUrl;
            var jsonURL = attrs.jsonUrl;

            var errorHandler = function(response) {
                MessageService.message('editarea', 'error', response.error)
            };
            scope.showErrorMsg = function(errorMsg) {
                scope.editareaErrorMsg = errorMsg;
                $('#editarea_error').show().fadeOut(3000)
            };
            var loadYAML = function() {
                //clear editarea
                _editareaElement.val('');
                var json = scope.editareaBinds.editareaValue.data;
                $http.post(yamlURL, json)
                    .success(function(yaml) {
                        if(!isEmpty(yaml)) {
                            _editareaElement.val(yaml);
                            _editareaElement.focus();
                        }
                    })
                    .error(errorHandler);
            };
            scope.save = function() {
                var yaml = _editareaElement.val();
                $http.post(jsonURL, {"yaml": yaml})
                    .success(function(json) {
                        scope.editareaBinds.editareaValue.data = json;
                        scope.editareaBinds.save = true;
                    })
                    .error(errorHandler);
            };
            scope.leaveEditarea = function(unmanual) {
                scope.editareaBinds.visible = false;
                scope.editareaBinds.dirty = false;
                scope.editareaErrorMsg = undefined;
                if(unmanual) {
                    scope.$apply();
                }
            };
            scope.reset = function() {
                scope.editareaBinds.dirty = false;
                scope.editareaErrorMsg = undefined;
                loadYAML();
            };
            _editareaElement.attr('rows', rows);

            // replace tabs with spaces or tabs
            _editareaElement.on('keydown', function(e) {
                if(e.keyCode == 9) {
                    var _indent = "";
                    if (indent == 'spaces') {
                        for (var i=0; i<tabwidth; i++) {
                            _indent += ' ';
                        }
                    } else {
                        for (var i=0; i<tabwidth; i++) {
                            _indent += '\t';
                        }
                    }
                    var startPos = this.selectionStart;
                    this.value = this.value.substring(0, startPos) + _indent + this.value.substring(startPos);
                    this.selectionStart = startPos + tabwidth;
                    this.selectionEnd = startPos + tabwidth;
                    return false;
                }
            });
            _editareaElement.on('keyup', function(e) {
                scope.$apply(function() {
                    scope.editareaBinds.dirty = true;
                });
            });

            scope.$watch('editareaBinds.visible', function(visible) {
                if(visible) {
                    scope.editareaBinds.dirty = false;
                    scope.editareaErrorMsg = undefined;
                    loadYAML();
                }
            }, true);

            //move the editarea togglebutton
            var _toggleButtonContainer = $('#_editarea_toggle_button_container');
            if(_toggleButtonContainer) {
                $(element).find('#_editarea_toggle_button').appendTo(_toggleButtonContainer);
            }
        }
    };
}).

directive('olMap', function($compile) {
    return {
        restrict: 'A',
        scope: {
            olmapBinds: '=olMap'
        },
        transclude: true,
        link: function(scope, element, attrs) {
            var createMap = function() {
                if(scope.map instanceof OpenLayers.Map) {
                    scope.map.destroy();
                    delete scope.map;
                }
                if(!(scope.olmapBinds.proj instanceof OpenLayers.Projection)) {
                    scope.olmapBinds.proj = new OpenLayers.Projection(scope.olmapBinds.proj);
                }
                if(!(scope.olmapBinds.extent instanceof OpenLayers.Bounds)) {
                    scope.olmapBinds.extent = new OpenLayers.Bounds(scope.olmapBinds.extent).transform(new OpenLayers.Projection('EPSG:4326'), scope.olmapBinds.proj);
                }
                scope.map = new OpenLayers.Map(scope.mapId, {
                    projection: scope.olmapBinds.proj,
                    allOverlays: true,
                    maxExtent: scope.olmapBinds.extent,
                    units: scope.olmapBinds.proj.units,
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
                    layers: scope.olmapBinds.layers
                });
                if(attrs.mapLayerSwitcher) {
                    var layerswitcher = new OpenLayers.Control.LayerSwitcher({roundedCorner: true});
                    scope.map.addControl(layerswitcher);
                    layerswitcher.maximizeControl();
                }
                scope.map.zoomToMaxExtent();
            };

            scope.destroyMap = function() {
                if(scope.map instanceof OpenLayers.Map) {
                    scope.map.destroy();
                    delete scope.map;
                }
                $.unblockUI();
                scope.olmapBinds.visible = false;
            };

            scope.olmapBinds = {
                visible: attrs.MapHidden || false,
                extent: undefined,
                proj: undefined,
                layers: undefined
            };

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

            scope.$watch('olmapBinds.visible', function(visible) {
                if(visible) {
                    createMap();
                    $.blockUI({
                        message: $(element),
                        css: {
                            top:  ($(window).height() - attrs.mapHeight) /2 + 'px',
                            left: ($(window).width() - attrs.mapWidth) /2 + 'px',
                            width: attrs.mapWidth
                        }
                    });
                }
            }, true);
        }
    }
}).

directive('messageHandler', function($templateCache, MessageService) {
    return {
        restrict: 'A',
        scope: 'Element',
        replace: true,
        transclude: true,
        template: function(element, attrs) {
            return $templateCache.get(attrs.messageHandler);
        },
        link: function(scope, element, attrs) {
            scope.messageService = MessageService;

            var messageTypes = attrs.messageTypes.split(',');

            angular.forEach(messageTypes, function(messageType) {
                scope.$watch('messageService.messages.' + messageType, function(messageObject) {
                    if(angular.isDefined(messageObject)) {
                        scope.message = messageObject.message;
                        scope.messageService.removeMessage(messageObject.section, messageObject.action);
                        $(element).show().fadeOut(3000);
                    }
                } , true);
            });
        }
    };
});

/* Controller for directives */

// used by toggleGroup
var toggleGroupCtrl = function($scope, $element) {
    var toggle_elements = [];
    var openElements = [];
    var toToggle = function(element) {
        switch(element.attr('toggle-element')) {
            case 'next':
                return $(element).next();
                break;
            default:
                return $(element);
        }
    };

    this.addElement = function(element) {
        toggle_elements.push(element);
    };
    this.getElementCount = function() {
        return toggle_elements.length;
    };

    this.multiShow = function(element, index) {
        if(toToggle(element).toggle().css('display') != 'none') {
            openElements.push(index);
        } else {
            var idx = $.inArray(index, openElements);
            if(idx != -1) {
                openElements.splice(idx, 1);
            }
        }
    };
    this.hideOther = function(element, index) {
        angular.forEach(toggle_elements, function(t_element) {
            if (t_element == element) {
                toToggle(t_element).show();
                openElements = [index];
            } else {
                toToggle(t_element).hide();
            }
        });
    };
    this.getToggleFunc = function() {
        switch($element.attr('mode')) {
            case 'multiShow':
                return this.multiShow;
                break;
            case 'hideOther':
            default:
                return this.hideOther;
        }
    };
    $scope.isOpen = function() {
        if(openElements.length == 0) {
            return this.$first;
        } else {
            return ($.inArray(this.$index, openElements) != -1)
        }
    };
}
