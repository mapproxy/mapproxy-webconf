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

            var sortable_element = $(element).sortable({
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
            //create a new not isolated scope
            scope = scope.$new(false)

            scope.checkExist = function(item) {
                var exist = false;
                if(scope.use_key) {
                    item = item[scope.use_key];
                }
                //because angular add a unique $$hashKey to objects
                angular.forEach(scope.items, function(scope_item) {
                    //angular.forEach doesn't support break
                    if(!exist) {
                        exist = angular.equals(scope_item, item);
                    }
                });
                if(!exist) {
                    scope.to_insert.push(item);
                }
            };
            scope.checkClass = function(elem) {
                var found = false;

                if(scope.accepts.length == 0) return true

                angular.forEach(scope.accepts, function(accept) {
                    if(!found) {
                        found = elem.hasClass(accept);
                    }
                });
                return found;
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

                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(scope.items);
                    if(angular.isUndefined(scope.items)) {
                        ngModelCtrl.$setValidity('required', false);
                    }
                });
            };
            scope.insertCallback = function(insert) {
                if(insert) {
                    scope.items = ngModelCtrl.$modelValue;
                    scope.checkExist(scope.new_item);
                    scope.insertItems();
                } else {
                    scope.j_ui.draggable('option', 'revert', true);
                }
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

                //check element class against accepts
                if(!scope.checkClass(scope.j_ui)) {
                    scope.j_ui.draggable('option', 'revert', true);
                    return;
                }
                //get data (string) of dopped element and convert it to an object
                scope.new_item = angular.fromJson(scope.j_ui.attr('item-data'));

                scope.to_insert = [];

                //check for data
                if(!angular.isUndefined(scope.new_item)) {
                    //run insert callback if present
                    if(angular.isFunction(scope.insert)) {
                        scope.insert(scope.$parent, {callback: scope.insertCallback, new_data: scope.new_item});
                    } else {
                        //check for existing items
                        if(angular.isArray(scope.new_item)) {
                            angular.forEach(scope.new_item, scope.checkExist);
                        } else {
                            scope.checkExist(scope.new_item);
                        }
                        //look if something to insert
                        if(scope.to_insert.length > 0) {
                            //run change callback if present
                            if(angular.isFunction(scope.change)) {
                                scope.change(scope.$parent, {callback: scope.changeCallback, new_data: scope.new_item});
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
            scope.rejects = angular.isUndefined(attrs.rejects) ? [] : attrs.rejects.split(',');

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
                toggleGroupCTRL.getToggleFunc()(element);
            });
        }
    }
}).

directive('tabs', function() {
    return {
        restrict: 'A',
        transclude: true,
        scope: {},
        controller: tabsCtrl,
        template:
            '<div class="tabbable">' +
            '<ul class="nav nav-tabs">' +
            '<li ng-repeat="pane in panes" ng-class="{active:pane.selected}">'+
            '<a href="" ng-click="select(pane)">{{pane.header}}</a>' +
            '</li>' +
            '</ul>' +
            '<div class="tab-content" ng-transclude></div>' +
            '</div>',
        replace: true
    };
}).

directive('pane', function() {
    return {
        require: '^tabs',
        restrict: 'A',
        transclude: true,
        scope: { header: '@' },
        link: function(scope, element, attrs, tabsCtrl) {
            tabsCtrl.addPane(scope);
        },
        template:
            '<div class="tab-pane" ng-class="{active: selected}" ng-transclude></div>',
        replace: true
    };
}).

directive('askDialog', function($parse, localize) {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {

            scope.openDialog = function(event) {
                event.stopPropagation();
                var buttons = {};
                buttons[localize.getLocalizedString('Yes')] = function() {
                    $(this).dialog("close");
                    scope.callback(scope);
                };
                buttons[localize.getLocalizedString('No')] = function() {
                    $(this).dialog("close");
                };
                scope.dialog.find('p').text(attrs.dialogText)
                scope.dialog.dialog({
                    resizeable: false,
                    width: 400,
                    height: 200,
                    model: true,
                    buttons: buttons
                });
            };
            scope.dialog_id = scope.$id;
            scope.callback = $parse(attrs.callback);
            scope.dialog = $('<div style="display:none;" id="dialog_' + scope.dialog_id + '" title="'+ attrs.dialogTitle +'"><p></p></div>');
            element.after(scope.dialog);

            element.bind('click', scope.openDialog);
        }
    };
}).

directive('confirmDialog', function($parse) {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {
            scope.openDialog = function(event) {
                event.stopPropagation();
                scope.dialog.find('p').html(attrs.dialogText)
                scope.dialog.dialog({
                    resizeable: false,
                    width: 600,
                    height: 300,
                    model: true,
                    buttons: {
                        "Ok": function() {
                            $(this).dialog("close");
                        }
                    }
                });
            };
            scope.dialog_id = scope.$id;
            scope.callback = $parse(attrs.callback);
            scope.dialog = $('<div style="display:none;" id="dialog_' + scope.dialog_id + '" title="'+ attrs.dialogTitle +'"><p></p></div>');
            element.after(scope.dialog);

            element.bind('click', scope.openDialog);
        }
    };
}).

/*
    labeled must point to existing template!
    labeled="[template]"
*/
directive('labeled', function($parse, localize) {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        // can't use templateURL, because $observe won't work with it
        // wait for https://github.com/angular/angular.js/issues/1941
        //
        // templateUrl: function(element, attrs) {
        //     return attrs.labeled
        // },
        template: function(element, attrs) {
            switch(attrs.labeled) {
                case 'checkbox_label':
                    return '<div class="control-group">' +
                             '<div class="controls">' +
                                 '<label class="control-label" for="{{name}}">' +
                                     '<span ng-transclude></span> {{getText()}}' +
                                 '</label>' +
                                 '<span ng-show="showWarning()" id="tooltip_{{$id}}" class="icon-warning-sign warning_icon"></span>' +
                             '</div>' +
                          '</div>';
                    break;
                case 'input_label':
                default:
                    return '<div class="control-group">' +
                          '<div class="controls">' +
                              '<label class="control-label" for="{{name}}">{{getText()}}:</label>' +
                              '<span ng-transclude></span>'+
                              '<span ng-show="showWarning()" id="tooltip_{{$id}}" class="icon-warning-sign warning_icon"></span>' +
                          '</div>' +
                      '</div>';
                    break;
            }
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

directive('editarea', function($http) {
    return {
        restrict: 'A',
        scope: 'element',
        require: 'ngModel',
        replace: true,
        template:
          "<div>" +
          "<button class='btn' ng-show='!_editarea.visible' ng-click='show()'>Edit manual</button>" +
          "<div ng-show='_editarea.visible'>" +
          "<textarea class='input-xlarge' id='_editarea'></textarea>"+
          "<button ng-show='!currentModelValue._manual' ask-dialog dialog-title=\"{{'Confirm!'|i18n}}\" dialog-text=\"{{'If you save the manual edition, you wont be able to edit it in the above form again. Realy save the manual edition?'|i18n}}\" callback='save()' class='btn'>{{'Save'|i18n}}</button>" +
          "<button ng-click='save()' ng-show='currentModelValue._manual' class='btn'>{{'Save'|i18n}}</button>" +
          "<button ng-click='reset()' ng-show='' class='btn'>Reset</button>" +
          "<button ng-click='leaveEditarea()' ng-show='!currentModelValue._manual' class='btn'>Back to form edit</button>" +
          "<span class='text-success source_save_ok' ng-show='false'>" +
          "<i class='icon-ok'></i>" +
          "<strong>{{'Saved successfully'|i18n}}</strong>" +
          "</span>" +
          "<span class='text-error' id='sourceform_service_error' ng-show='editareaErrorMsg'>" +
          "<i class='icon-thumbs-down'></i>" +
          "{{editareaErrorMsg}}" +
          "</span>" +
          "</div>" +
          "</div>",
        controller: function($scope, $element, $attrs) {
            //$scope.$parent -> outer scope
            var maxrows = $attrs.maxrows || 30;
            var _editareaElement = $($element).find('#_editarea');
            var privateAttributes = {};

            var loadYAML = function() {
                //need to copy cause we modify the object in called function
                var json = prepareEditareaValue(angular.copy($scope.currentModelValue));
                //make url configurateable
                $http.post('/yaml', json)
                    .success(function(yaml) {
                        var rows = yaml.match(/[^\n]*\n[^\n]*/gi).length + 1;
                        _editareaElement.attr('rows', (rows > maxrows) ? maxrows : rows);
                        _editareaElement.val(yaml);
                    })
                    .error(function(response) {
                        $scope.editareaErrorMsg = response.error;
                    });
            };

            var prepareEditareaValue = function(value) {
                angular.forEach(value, function(val, key) {
                    if(key[0] === '_') {
                        privateAttributes[key] = val;
                    }
                });
                angular.forEach(privateAttributes, function(val, key) {
                    delete value[key];
                });

                return angular.toJson(value, true);
            };

            $scope.currentModelValue = undefined;

            $scope.show = function(modelValue) {
                $scope._editarea.visible = true;
                privateAttributes = {};
                $scope._editarea.dirty = false;
                $scope.currentModelValue = undefined;
                $scope.editareaErrorMsg = undefined;
                //if this function is called from outside of directive, we need to pass the modelValue,
                //cause $scope.modelCtrl.$modelValue is not up-to-date in that case
                $scope.currentModelValue = (angular.isDefined(modelValue)) ? modelValue : $scope.modelCtrl.$modelValue;
                loadYAML();
            };
            $scope.save = function() {
                var yaml = _editareaElement.val();
                $http.post('/json', {"yaml": yaml})
                    .success(function(json) {
                        $scope.currentModelValue = $.extend({}, json, privateAttributes);
                        $scope.currentModelValue._manual = true;
                        $scope.$root.$broadcast('editarea.save', $scope.currentModelValue);
                    })
                    .error(function(response) {
                        $scope.editareaErrorMsg = response.error;
                    });
            };
            $scope.leaveEditarea = function() {
                privateAttributes = {};
                $scope._editarea.visible = false;
                $scope._editarea.dirty = false;
                $scope.currentModelValue = undefined;
                $scope.editareaErrorMsg = undefined;
            };
            $scope.reset = function() {
                privateAttributes = {};
                $scope._editarea.dirty = false;
                $scope.editareaErrorMsg = undefined;
                loadYAML();
            };

            //register necessary functions and variables in parent scope
            $scope.$parent._editarea = {
                visible: false,
                show: $scope.show,
                dirty: false
            };
        },
        link: function(scope, element, attrs, ngModelCtrl) {
            //scope.$parent -> directive controller scope
            scope = scope.$new(false);
            var _editareaElement = $(element).find('#_editarea');
            var tabwidth = attrs.tabwidth || 2;
            var indent = attrs.indent || 'spaces';

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
                    this.value = this.value.substring(0, startPos) + _indent + this.value.substring(this.selectionEnd);
                    this.selectionStart = startPos + tabwidth;
                    return false;
                }
            });
            _editareaElement.on('keyup', function(e) {
                scope._editarea.dirty = true;
            });
            scope.$parent.modelCtrl = ngModelCtrl;
        }
    };
});

/* Controller for directives */

// used by toggleGroup
var toggleGroupCtrl = function($scope, $element) {
    var toggle_elements = [];

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

    this.multiShow = function(element) {
        toToggle(element).toggle();
    };
    this.hideOther = function(element) {
        angular.forEach(toggle_elements, function(t_element) {
            if (t_element == element) {
                toToggle(t_element).show();
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
}

// used by tabs
var tabsCtrl = function($scope, $element) {

    this.addPane = function(pane) {
        if (panes.length == 0) $scope.select(pane);
        panes.push(pane);
    };

    $scope.select = function(pane) {
        angular.forEach(panes, function(pane) {
            pane.selected = false;
        });
        pane.selected = true;
    };

    var panes = $scope.panes = [];
};
