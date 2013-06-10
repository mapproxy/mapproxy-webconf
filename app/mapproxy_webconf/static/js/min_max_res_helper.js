var convertMinMaxRes = function(scope, http, url, mode) {
    if(angular.isDefined(scope.custom.min_res) || angular.isDefined(scope.custom.max_res)) {
        data = [
            scope.custom.min_res || null,
            scope.custom.max_res || null
        ];
        http.post(url, {
            "data": data,
            "dpi": scope.defaults.data.dpi,
            "units": scope.custom.units,
            "mode": mode
        }).success(function(response) {
            scope.custom.min_res = response.result[0];
            scope.custom.max_res = response.result[1];
        });
    }
};

var insertMinMaxRes = function(scope, dataElement) {
    var mode = scope.custom.resSelected ? '' : '_scale';
    dataElement.data['units'] = scope.custom.units || undefined;
    dataElement.data['min_res' + mode] = angular.isDefined(scope.custom.min_res) ? scope.custom.min_res : undefined;
    dataElement.data['max_res' + mode] = angular.isDefined(scope.custom.max_res) ? scope.custom.max_res : undefined;
    if(mode == '') {
        delete dataElement.data.min_res_scale;
        delete dataElement.data.max_res_scale;
    } else {
        delete dataElement.data.min_res;
        delete dataElement.data.max_res;
    }
};

var extractMinMaxRes = function(scope, dataElement) {
        scope.custom.min_res = dataElement.data['min_res'] || dataElement.data['min_res_scale'];
        scope.custom.max_res = dataElement.data['max_res'] || dataElement.data['max_res_scale'];
        scope.custom.units = dataElement.data['units'] || 'm';
        scope.custom.resSelected = angular.isDefined(dataElement.data['min_res']) || angular.isDefined(dataElement.data['max_res']);
        if(scope.custom.resSelected) {
            scope.custom.min_resLabel = 'min_res';
            scope.custom.max_resLabel = 'max_res';
        } else {
            scope.custom.min_resLabel = 'min_res_scale';
            scope.custom.max_resLabel = 'max_res_scale';
        }
};
