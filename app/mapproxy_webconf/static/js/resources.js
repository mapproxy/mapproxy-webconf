angular.module('mapproxy_gui.resources', ['ngResource']).

factory('MapproxyResource', function($resource) {
    return $resource('/conf/'+PROJECT+'/:action/:id', {id: '@id', action: '@action'}, {
        update: {method: 'PUT'}
    });
});
