angular.module('angular.extensions', [])

//found at https://gist.github.com/eliotsykes/5394631
//remove when https://github.com/angular/angular.js/issues/1277 is closed and included into angularjs
.directive('ngFocus', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var fn = $parse(attr['ngFocus']);
    element.bind('focus', function(event) {
      fn(scope, {$event:event});
      helper.safeApply(scope);
    });
  }
}])

.directive('ngBlur', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var fn = $parse(attr['ngBlur']);
    element.bind('blur', function(event) {
      fn(scope, {$event:event});
      helper.safeApply(scope);
    });
  }
}]);
