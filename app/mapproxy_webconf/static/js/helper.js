var dict2list = function(dict) {
    var result = [];
    for(var key in dict) {
        result.push(dict[key]);
    }
    return result;
};

var clearData = function(dict) {
    angular.forEach(dict, function(value, key) {
        if(value == undefined || value == 0 || value == [] || value == {}) {
            delete(dict[key]);
        } else if(angular.isObject(value)) {
            dict[key] = clearData(value);
        } else if(angular.isArray(value)) {
            angular.forEach(value, function(val) {
                if(angular.isUndefined(val)) {
                    value.splice(value.indexOf(val), 1);
                }
                if(value == []) {
                    delete(dict[key]);
                } else {
                    dict[key] = value;
                }
            });
        }
    });
    return dict;
};
