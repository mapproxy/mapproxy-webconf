angular.module('mapproxy_gui.resources', ['ngResource']).

factory('MapproxyResource', function($resource, $rootScope) {
    return $resource('/conf/'+$rootScope.PROJECT+'/:action/:id', {id: '@id', action: '@action'}, {
        update: {method: 'PUT'}
    });
});
