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
            dict[key] = clearData(value);
        }
    });
    return dict;
};

var isEmpty = function(item) {
    if(angular.isArray(item) || angular.isObject(item)) {
        var empty = true;
        angular.forEach(item, function(itm) {
            if(!isEmpty(itm)) {
                empty = false;
            }
        });
        return empty;
    } else {
        return item == undefined || item == [] || item == {} || item == null || item == '';
    }
};
