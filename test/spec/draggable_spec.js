describe('draggable directive', function() {
    var elm, scope;

    beforeEach(module('mapproxy_gui.directives'));

    beforeEach(inject(function($rootScope, $compile) {
        elm = angular.element('<div draggable item-data="{\'foo\': true}">Draggable</div>');
        scope = $rootScope;
        $compile(elm)(scope);
        scope.$digest();
    }));

    it('should have class ui-draggable', inject(function() {
        expect(elm.text()).toBe('Draggable');
        expect(elm).toHaveClass('ui-draggable');
    }));

    it('should contain data', inject(function() {
        expect(elm.attr('item-data')).toBe("{'foo': true}");
    }));
})