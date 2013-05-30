var clearData = function(dict) {
    angular.forEach(angular.copy(dict), function(value, key) {
        if(typeof(value) == 'boolean') {
            angular.noop();
        } else if(value == undefined || value == 0 || value == [] || value == {} || value == null || value == '') {
            delete(dict[key]);
        } else if(angular.isArray(value)) {
            angular.forEach(angular.copy(value), function(val) {
                if(val == undefined || val == 0 || val == [] || val == {} || val == null || value == '') {
                    value.splice(value.indexOf(val), 1);
                }
            });
            if(value.length == 0) {
                delete(dict[key]);
            } else {
                dict[key] = value;
            }

        } else if(angular.isObject(value)) {
            if(isEmpty(value)) {
                delete(dict[key]);
            } else {
                dict[key] = clearData(value);
            }
        }
    });
    return dict;
};

var isEmpty = function(item) {
    if(angular.isArray(item) || angular.isObject(item)) {
        var empty = true;
        angular.forEach(item, function(itm, key) {
            //ignore angularjs vars
            if(!angular.isNumber(key) && key.substr(0, 2) == '$$') {
                angular.noop();
            } else if(!isEmpty(itm)) {
                empty = false;
            }
        });
        return empty;
    } else {
        return item == undefined || item == [] || item == {} || item == null || item == '';
    }
};

var nameExistInService = function(name, id, service, services) {
    var found = false;
    angular.forEach(services, function(_service) {
        found = found || _service.byName(name);
    });
    if(found && (found._section != service.section || found._id != id)) {
        return found._section;
    } else {
        return false;
    }
};

//prevent error if $apply already in progress
//found at http://stackoverflow.com/questions/12729122/prevent-error-digest-already-in-progress-when-calling-scope-apply
var saveApply = function(scope) {
    if(!scope.$$phase) {
        scope.$apply();
    }
}
