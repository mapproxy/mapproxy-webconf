angular.module('mapproxy_gui.messages', []).

service('MessageService', function($rootScope) {
    var service = {};

    service.messages = {};
    service.notifies = {};
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
    service.notifyOnly = function(section, action) {
        service.notifies[section] = service.notifies[section] || {};
        service.notifies[section][action] = new Date().getTime();

    }
    return service;
}).

directive('messageHandler', function($templateCache, MessageService, FADEOUT_DELAY) {
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
                        $(element).show().delay(FADEOUT_DELAY).fadeOut('slow');
                    }
                });
            });
        }
    };
}).

directive('spinner', function(MessageService) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            scope.messageService = MessageService;
            scope.active = false;
            $(element).hide();
            var service = attrs.spinner;
            scope.$watch('messageService.notifies.' + service + '.request_start', function() {
                scope.active = true;
                // hide all message areas before showing spinner
                $("div.messsage-area").hide();
                $(element).show();
            });

            scope.$watch('messageService.notifies.' + service + '.request_end', function() {
                if(scope.active) {
                    scope.active = false;
                    $(element).hide();
                }
            });
        }
    }
});
