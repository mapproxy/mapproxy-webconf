var dict2list = function(dict) {
    var result = [];
    for(var key in dict) {
        result.push(dict[key]);
    }
    return result;
};