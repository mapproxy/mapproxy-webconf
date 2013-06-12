angular.module('mapproxy_gui.messages', []).

service('MessageService', function($rootScope) {
    var service = {};

    service.messages = {};
    service.message = function(section, action, message) {
        service.messages[section] = service.messages[section] || {};
        service.messages[section][action] = {
            'section': section,
            'action': action,
            'message': message
        }
    };

    service.removeMessage = function(section, action) {
        delete service.messages[section][action];
    }
    return service;
}).

directive('messageHandler', function($templateCache, MessageService) {
    return {
        restrict: 'A',
        scope: 'Element',
        replace: true,
        transclude: true,
        template: function(element, attrs) {
            return $templateCache.get(attrs.messageHandler);
        },
        link: function(scope, element, attrs) {
            scope.messageService = MessageService;

            var messageTypes = attrs.messageTypes.split(',');

            angular.forEach(messageTypes, function(messageType) {
                scope.$watch('messageService.messages.' + messageType, function(messageObject) {
                    if(angular.isDefined(messageObject)) {
                        scope.message = messageObject.message;
                        scope.messageService.removeMessage(messageObject.section, messageObject.action);
                        $(element).show().fadeOut(3000);
                    }
                } , true);
            });
        }
    };
});