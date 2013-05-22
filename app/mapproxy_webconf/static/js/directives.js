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
                if(angular.isArray(item)) {
                    angular.forEach(item, scope.checkExist);
                } else {
                    var exist = false;
                    if(scope.use_key) {
                        item = item[scope.use_key];
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
                    if(scope.to_insert.length > 0) {
                        scope.insertItems();
                    }
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
                        scope.checkExist(scope.new_item);
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
        replace: true,
        template:
          "<div>" +
          "<button class='btn btn-small' ng-show='!_editarea.visible' ng-click='show()' id='_editarea_toggle_button'>{{'Edit manual'|i18n}}</button>" +
          "<div ng-show='_editarea.visible'>" +
          "<h3>{{'Edit manual'|i18n}}</h3>" +
          "<textarea class='input-xlarge' id='_editarea'></textarea>"+
          "<div class='text-center'>" +
          "<button ng-show='!privateAttributes._manual' ask-dialog dialog-title=\"{{'Confirm!'|i18n}}\" dialog-text=\"{{'If you save the manual edition, you wont be able to edit it in the above form again. Realy save the manual edition?'|i18n}}\" callback='save()' class='btn btn-small'>{{'Save'|i18n}}</button>" +
          "<button ng-click='save()' ng-show='privateAttributes._manual' class='btn btn-small'>{{'Save'|i18n}}</button>" +
          "<button ng-click='reset()' class='btn btn-small'>{{'Reset'|i18n}}</button>" +
          "<button ng-click='leaveEditarea()' ng-show='!privateAttributes._manual' class='btn btn-small'>{{'Back to form edit'|i18n}}</button>" +
          "</div>" +
          "<div class='text-center'>" +
          "<span class='text-success save_ok' ng-show='false'>" +
          "<br>" +
          "<i class='icon-ok'></i>" +
          "<strong>{{'Saved successfully'|i18n}}</strong>" +
          "</span>" +
          "<span class='text-error' id='editarea_error' ng-show='false'>" +
          "<br>" +
          "<i class='icon-thumbs-down'></i>" +
          "{{editareaErrorMsg}}" +
          "</span>" +
          "</div>" +
          "</div>" +
          "</div>",
        controller: function($scope, $element, $attrs) {
            //$scope.$parent -> outer scope
            var minrows = $attrs.minrows || 10;
            var maxrows = $attrs.maxrows || 30;
            var yamlURL = $attrs.yamlUrl;
            var jsonURL = $attrs.jsonUrl;
            var _editareaElement = $($element).find('#_editarea');

            var emptyAttributes = {};
            $scope.privateAttributes = {};

            var errorHandler = function(response) {
                $scope.editareaErrorMsg = response.error;
                $('#editarea_error').show().fadeOut(3000)
            };

            var loadYAML = function() {
                //clear editarea
                _editareaElement.val('');
                _editareaElement.attr('rows', minrows);
                //need to copy cause we modify the object in called function
                var json = prepareEditareaValue(angular.fromJson(angular.copy($scope.editareaValue)));
                //make url configurateable
                $http.post(yamlURL, json)
                    .success(function(yaml) {
                        if(!isEmpty(yaml)) {
                            var rows = yaml.match(/[^\n]*\n[^\n]*/gi).length + 1;
                            rows = (rows < minrows) ? minrows : rows;
                            _editareaElement.attr('rows', (rows > maxrows) ? maxrows : rows);
                            _editareaElement.val(yaml);
                        }
                    })
                    .error(errorHandler);
            };

            var prepareEditareaValue = function(value) {
                var keepEmptyFields = angular.isDefined($attrs.keepEmptyFields) ? $attrs.keepEmptyFields.split(',') : [];

                angular.forEach(value, function(val, key) {
                    if($.inArray(key, keepEmptyFields) != -1) {
                        angular.noop();
                    } else if(key[0] === '_') {
                        $scope.privateAttributes[key] = val;
                    } else if(isEmpty(val)) {
                        emptyAttributes[key] = val;
                    } else if(angular.isObject(val)) {
                        angular.forEach(val, function(_val, _key) {
                            if(isEmpty(_val)) {
                                if(angular.isUndefined(emptyAttributes[key])) {
                                    emptyAttributes[key] = {};
                                }
                                emptyAttributes[key][_key] = _val;
                            }
                        });
                    }
                });
                angular.forEach($scope.privateAttributes, function(val, key) {
                    delete value[key];
                });
                angular.forEach(emptyAttributes, function(val, key) {
                    if(angular.isObject(val) && !angular.isArray(val)) {
                        if(Object.keys(val).length == 0) {
                            delete value[key];
                        } else {
                            angular.forEach(val, function(_val, _key) {
                                delete value[key][_key];
                            });
                        }
                    } else {
                        delete value[key];
                    }
                });

                return angular.toJson(value, true);
            };


            $scope.show = function(editareaValue) {
                $scope._editarea.visible = true;
                $scope.privateAttributes = {};
                emptyAttributes = {};
                $scope._editarea.dirty = false;
                //$scope.currentModelValue = undefined;
                $scope.editareaValue = undefined;
                $scope.editareaErrorMsg = undefined;
                //if this function is called from outside of directive, we need to pass the editareaValue,
                //cause $attrs.editareaValue is not up-to-date in that case
                $scope.editareaValue = (angular.isDefined(editareaValue)) ? editareaValue : $attrs.editareaValue;
                loadYAML();
            };
            $scope.showErrorMsg = function(errorMsg) {
                $scope.editareaErrorMsg = errorMsg;
                $('#editarea_error').show().fadeOut(3000)
            };
            $scope.save = function() {
                var yaml = _editareaElement.val();
                $http.post(jsonURL, {"yaml": yaml})
                    .success(function(json) {
                        $scope.editareaValue = $.extend(true, {}, emptyAttributes, json, $scope.privateAttributes);
                        $scope.editareaValue._manual = true;
                        $scope.$root.$broadcast('editarea.save', $scope.editareaValue);
                    })
                    .error(errorHandler);
            };
            $scope.leaveEditarea = function() {
                $scope.privateAttributes = {};
                emptyAttributes = {};
                $scope._editarea.visible = false;
                $scope._editarea.dirty = false;
                $scope.editareaValue = undefined
                $scope.editareaErrorMsg = undefined;
            };
            $scope.reset = function() {
                $scope.privateAttributes = {};
                emptyAttributes = {};
                $scope._editarea.dirty = false;
                $scope.editareaErrorMsg = undefined;
                loadYAML();
            };

            //register necessary functions and variables in parent scope
            $scope.$parent._editarea = {
                show: $scope.show,
                showErrorMsg: $scope.showErrorMsg,
                visible: false,
                dirty: false
            };
        },
        link: function(scope, element, attrs) {
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
                    this.value = this.value.substring(0, startPos) + _indent + this.value.substring(startPos);
                    this.selectionStart = startPos + tabwidth;
                    this.selectionEnd = startPos + tabwidth;
                    return false;
                }
            });
            _editareaElement.on('keyup', function(e) {
                scope._editarea.dirty = true;
            });
            scope.$parent.editareaValue = attrs.editareaValue;

            var _toggleButtonContainer = $('#_editarea_toggle_button_container');
            if(_toggleButtonContainer) {
                $(element).find('#_editarea_toggle_button').appendTo(_toggleButtonContainer);
            }
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
