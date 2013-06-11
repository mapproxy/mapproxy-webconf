angular.module('mapproxy_gui.tooltips', []).

/**
 * Loads a json dict from given URL
 *
 * Example dict:
 *
 * {
 *     'tooltipID': {
 *         'content': 'The tooltip content',
 *         'title': 'Popover title'
 *     }
 * }
 *
 * 'title' is optional. If provided, a popover is created, otherwise a tooltip is created
 *
 * In application initialization use tooltipMapper.loadDict(url) to specify and load the
 * tooltip dict
 *
 * Example:
 * app.run(function(tooltipMapper) {
 *     tooltipMapper.loadDict('[url_to_tooltip_dict]');
 * });
 */

factory('tooltipMapper', function($http, $rootScope) {
    var tooltipMapper = {
        tooltips: {},
        loadDict: function(url) {
            $http.get(url, {cache: false}).success(function(data) {
                tooltipMapper.tooltips = data;
                $rootScope.$broadcast('tooltipsLoaded');
            }); //XXXkai: error handling
        }
    };

    return tooltipMapper;
}).

/**
 * Example:
 *   <button tooltip="tooltipID"></button>
 * Description:
 *   Will look after tooltipID in tooltipMapper and create a tooltip with tooltipMapper.tooltips[tooltipID].content
 *   If tooltipMapper.tooltips[tooltipID].title is provided, a popover is created
 *
 * Example:
 *   <button tooltip tooltip-content="ToolTip"></button>
 * Description:
 *   Will create a tooltip with tooltip-content. don't lkook in tooltipMapper
 *   If tooltip-title is provided, a popover is created
 *
 * Other options:
 *   tooltip-placement: [left, right, top, bottom]
 */
directive('tooltip', function(tooltipMapper) {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {
            var initPopover = function(content, title) {
                $(element).popover({
                    title: title,
                    content: content,
                    trigger: 'hover',
                    placement: scope.tooltipPlacement
                });
            };
            var initTooltip = function(content) {
                $(element).attr('data-original-title', content);
                $(element).tooltip({
                    placement: scope.tooltipPlacement
                });
            };

            scope.tooltipPlacement = attrs.tooltipPlacement || 'right';

            if(angular.isDefined(attrs.tooltipContent)) {
                if(angular.isDefined(attrs.tooltipTitle)) {
                    initPopover(attrs.tooltipContent, attrs.tooltipTitle);
                } else {
                    initTooltip(attrs.tooltipContent);
                }
            } else {
                scope.$on('tooltipsLoaded', function() {
                    var tooltipData = tooltipMapper.tooltips[attrs.tooltip];

                    if(angular.isDefined(tooltipData.title)) {
                        initPopover(tooltipData.content, tooltipData.title);
                    } else {
                        initTooltip(tooltipData.content);
                    }
                });
            }
        }
    };
});
