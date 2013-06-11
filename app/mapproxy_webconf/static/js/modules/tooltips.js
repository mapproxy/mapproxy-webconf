angular.module('mapproxy_gui.tooltips', []).

directive('tooltip', function() {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {
            var initPopover = function() {
                $(element).popover({
                    title: scope.tooltipTitle,
                    content: scope.tooltipContent,
                    trigger: 'hover',
                    placement: scope.tooltipPlacement
                });
            };
            var initTooltip = function() {
                $(element).attr('data-original-title', scope.tooltipContent);
                $(element).tooltip({
                    title: scope.tooltipTitle,
                    placement: scope.tooltipPlacement
                });
            };

            scope.tooltipMode = attrs.tooltip || 'tooltip';
            scope.tooltipContent = attrs.tooltipContent;
            scope.tooltipTitle = attrs.tooltipTitle;
            scope.tooltipPlacement = attrs.tooltipPlacement || 'right';

            if(scope.tooltipMode == 'popover') {
                initPopover();
            } else {
                initTooltip();
            }

            attrs.$observe('tooltipContent', function(val) {
                scope.tooltipContent = val;
                if(scope.tooltipMode == 'popover') {
                    $(element).popover('destroy');
                    initPopover();
                } else {
                    $(element).tooltip('destroy');
                    initTooltip();
                }
            });
            attrs.$observe('tooltipTitle', function(val) {
                scope.tooltipTitle = val;
                if(scope.tooltipMode == 'popover') {
                    $(element).popover('destroy');
                    initPopover();
                } else {
                    $(element).tooltip('destroy');
                    initTooltip();
                }
            });
        }
    }
});