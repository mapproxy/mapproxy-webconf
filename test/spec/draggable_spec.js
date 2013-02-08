describe('draggable directive', function() {
    var elm, scope;

    beforeEach(module('mapproxy_gui.directives'));

    beforeEach(inject(function($rootScope, $compile) {
        elm = angular.element('<div draggable>Draggable</div>');
        scope = $rootScope;
        $compile(elm)(scope);
        scope.$digest();
    }));

    it('should be draggable', inject(function() {
        expect(elm.text()).toBe('Draggable');
        expect(elm).toHaveClass('ui-draggable');
    }));
})