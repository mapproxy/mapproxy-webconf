angular.module('mapproxy_gui.resources', ['ngResource']).

factory('MapproxySourceResource', function($resource) {
    return $resource('/conf/base/sources/:id', {}, {
        update: {method: 'PUT'}
    });
}).

factory('GetCapabilitiesResource', function($resource) {
    return $resource('/conf/base/wms_capabilities/:id', {}, {
        update: {method: 'PUT'}
    });
});