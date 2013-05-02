var INTEGER_REGEXP = /^\-?\d*$/;
var FLOAT_REGEXP = /^\-?\d*((\.|\,)\d+)?$/;

angular.module('mapproxy_gui.validators', []).

directive('integer', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                if (!viewValue || INTEGER_REGEXP.test(viewValue)) {
                    // it is valid
                    ctrl.$setValidity('integer', true);
                    return viewValue;
                } else {
                    // it is invalid, return undefined (no model update)
                    ctrl.$setValidity('integer', false);
                    return undefined;
                }
            });
        }
    };
}).

directive('float', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                if (!viewValue) {
                    ctrl.$setValidity('float', true);
                    return viewValue;
                } else if (FLOAT_REGEXP.test(viewValue)) {
                    ctrl.$setValidity('float', true);
                    //allow . and ,
                    return parseFloat(viewValue.replace(',', '.'));
                } else {
                    ctrl.$setValidity('float', false);
                    return undefined;
                }
            });
        }
    };
}).

directive('biggerThan', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            scope.watchElement = attrs.biggerThan;

            scope.$watch(scope.watchElement, function(newVal, oldVal) {
                scope.toCompare = newVal;
                scope.compare();
            });

            scope.compare = function() {
                if (!scope.viewValue || !scope.toCompare || parseFloat(scope.viewValue) > parseFloat(scope.toCompare)) {
                    ctrl.$setValidity('biggerThan', true);
                    return scope.viewValue;
                } else {
                    ctrl.$setValidity('biggerThan', false);
                    return undefined;
                }
            };

            ctrl.$parsers.unshift(function(viewValue) {
                scope.viewValue = viewValue;
                scope.compare();
            });
        }
    };
}).

directive('unique', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                var unique = true;
                angular.forEach(angular.fromJson(attrs.unique), function(item) {
                    if(viewValue == item) {
                        unique = false;
                    }
                });
                if(unique) {
                    ctrl.$setValidity('unique', true);
                    return viewValue;
                } else {
                    ctrl.$setValidity('unique', false);
                    return undefined;
                }
            });
        }
    }
});
