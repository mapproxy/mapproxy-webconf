var INTEGER_REGEXP = /^\-?\d*$/;
app.directive('integer', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                if (INTEGER_REGEXP.test(viewValue)) {
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
});

var FLOAT_REGEXP = /^\-?\d+((\.|\,)\d+)?$/;
app.directive('float', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                if (FLOAT_REGEXP.test(viewValue)) {
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
});

app.directive('biggerthan', function() {
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function(viewValue) {
                var biggerthan = parseFloat(attrs.biggerthan)
                if(parseFloat(viewValue) > biggerthan) {
                    ctrl.$setValidity('biggerthan', true);
                    return viewValue;
                } else {
                    ctrl.$setValidity('biggerthan', false);
                    return undefined;
                }
            });
        }
    };
});
