angular.module('mapproxy_gui.resScales', []).

directive('resScales', function($http, CONVERT_URL, TEMPLATE_URL, CONVERT_URL) {
    return {
        restrict: 'A',
        scope: {
            binds: '=resScales',
            mode: '@', //list, min_max
            dpi: '=',
            ngDisabled: '=',
            form: '=parentForm'
        },
        replace: true,
        transclude: true,
        templateUrl: TEMPLATE_URL,
        controller: function($scope, $attrs, $element) {
            var getDataFromInputs = function() {
                var data = [];
                if($scope.mode == 'min_max') {
                    data = $scope.resSelected ? [$scope.data.min_res, $scope.data.max_res] : [$scope.data.min_res_scale, $scope.data.max_res_scale];
                } else {
                    data = $scope.data.resScales;
                }
                return data;
            };
            var getMinMax = function() {
                if((!angular.equals([$scope.data.min_res, $scope.data.max_res], [$scope.binds.min_res, $scope.binds.max_res])) ||
                   (!angular.equals([$scope.data.min_res_scale, $scope.data.max_res_scale], [$scope.binds.min_res_scale, $scope.binds.max_res_scale]))) {
                    $scope.resSelected = (angular.isUndefined($scope.binds.min_res_scale) && angular.isUndefined($scope.binds.max_res_scale));
                    $scope.data.units = $scope.binds.units;
                    $scope.data.min_res = $scope.binds.min_res;
                    $scope.data.max_res = $scope.binds.max_res;
                    $scope.data.min_res_scale = $scope.binds.min_res_scale;
                    $scope.data.max_res_scale = $scope.binds.max_res_scale;
                }
            };
            var setMinMax = function() {
                if((!angular.equals([$scope.data.min_res, $scope.data.max_res], [$scope.binds.min_res, $scope.binds.max_res])) ||
                   (!angular.equals([$scope.data.min_res_scale, $scope.data.max_res_scale], [$scope.binds.min_res_scale, $scope.binds.max_res_scale]))) {
                    $scope.binds.min_res = $scope.data.min_res;
                    $scope.binds.max_res = $scope.data.max_res;
                    $scope.binds.min_res_scale = $scope.data.min_res_scale;
                    $scope.binds.max_res_scale = $scope.data.max_res_scale;
                    $scope.form.$setDirty();
                }
            }
            $scope.convert = function(convertMode) {
                var data = getDataFromInputs();

                $http.post(CONVERT_URL, {
                    "data": data,
                    "dpi": $scope.dpi,
                    "units": $scope.data.units,
                    "mode": convertMode
                }).success(function(response) {
                    $scope.resSelected = convertMode == 'to_res';
                    if($scope.mode == 'min_max') {
                        if($scope.resSelected) {
                            $scope.data.min_res = response.result[0];
                            $scope.data.max_res = response.result[1];
                            $scope.data.min_res_scale = undefined;
                            $scope.data.max_res_scale = undefined;
                        } else {
                            $scope.data.min_res_scale = response.result[0];
                            $scope.data.max_res_scale = response.result[1];
                            $scope.data.min_res = undefined;
                            $scope.data.max_res = undefined;
                        }
                    } else {
                        $scope.data.resScales = response.result
                        $scope.binds.res = $scope.resSelected ? $scope.data.resScales : [];
                        $scope.binds.scales = $scope.resSelected ? [] : $scope.data.resScales;
                    }
                });
            };

            $scope.init = {
                list: function() {
                    $scope.resSelected = !helper.isEmpty($scope.binds.res)
                    $scope.data.resScales = $scope.resSelected ? $scope.binds.res : $scope.binds.scales || [];
                    $scope.data.units = $scope.binds.units;

                    $scope.$watch('data.units', function() {
                        $scope.binds.units = $scope.data.units;
                    });

                    $scope.$watch('data.resScales', function(value) {
                        if(angular.isDefined(value)) {
                            if($scope.resSelected) {
                                if(!angular.equals($scope.binds.res, value)) {
                                    $scope.form.$setDirty();
                                }
                                $scope.binds.res = value;
                                $scope.binds.scales = [];
                            } else {
                                if(!angular.equals($scope.binds.scale, value)) {
                                    $scope.form.$setDirty();
                                }
                                $scope.binds.scales = value;
                                $scope.binds.res = [];
                            }
                        }
                    });

                    $scope.$watch('binds', function(value) {
                        if(angular.isDefined(value)) {
                            if((($scope.resSelected && !angular.equals($scope.binds.res, $scope.data.resScale))) ||
                               (!$scope.resSelected && !angular.equals($scope.binds.scales, $scope.data.resScale))) {
                                $scope.resSelected = !helper.isEmpty($scope.binds.res)
                                $scope.data.resScales = $scope.resSelected ? $scope.binds.res : $scope.binds.scales || [];
                                $scope.data.units = $scope.binds.units;
                            }
                        }
                    }, true);
                },
                min_max: function() {
                    getMinMax();

                    $scope.$watch('data.units', function(value) {
                        if(angular.isDefined(value)) {
                            $scope.binds.units = value;
                        }
                    });
                    $scope.$watch('data.min_res+data.max_res', function(value) {
                        if(angular.isDefined(value)) {
                            setMinMax();
                        }
                    });
                    $scope.$watch('data.min_res_scale+data.max_res_scale', function(value) {
                        if(angular.isDefined(value)) {
                            setMinMax();
                        }
                    });
                    $scope.$watch('binds.min_res+binds.max_res', function(value) {
                        if(angular.isDefined(value)) {
                            getMinMax();
                        }
                    });
                    $scope.$watch('binds.min_res_scale+binds.max_res_scale', function(value) {
                        if(angular.isDefined(value)) {
                            getMinMax();
                        }
                    });
                }
            };

            $scope.resSelected = false;
            $scope.data = {
                units: 'm',
                resScales: [],
                min_res: undefined,
                max_res: undefined,
                min_res_scale: undefined,
                max_res_scale: undefined
            };
        },
        link: function(scope, element, attrs) {
            scope.init[attrs.mode]();
        }
    };
});
