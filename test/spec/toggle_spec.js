describe('toggleElement hideOther', function() {
    var elm, scope;

    // load the toggleElement code
    beforeEach(module('mapproxy_gui.directives'));

    describe('default mode (toggle element)', function() {
        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element(
                '<div toggle-group>' +
                    '<div ng-show="true" toggle-element>Elem1</div>' +
                    '<div ng-show="false" toggle-element>Elem2</div>' +
                    '<div ng-show="false" toggle-element>Elem3</div>' +
                '</div>');
            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();
        }));

        it('should show only the first element', function() {
            var toggle_elements = elm.find('div');

            expect(toggle_elements.length).toBe(3);
            expect(toggle_elements.eq(0).text()).toBe('Elem1');
            expect(toggle_elements.eq(1).text()).toBe('Elem2');
            expect(toggle_elements.eq(2).text()).toBe('Elem3');

            expect(toggle_elements.eq(0).css('display')).toBe('block');
            expect(toggle_elements.eq(1).css('display')).toBe('none');
            expect(toggle_elements.eq(2).css('display')).toBe('none');
        });

        it('should show only the secound element after click it', function() {
            var toggle_elements = elm.find('div');

            expect(toggle_elements.length).toBe(3);
            expect(toggle_elements.eq(0).text()).toBe('Elem1');
            expect(toggle_elements.eq(1).text()).toBe('Elem2');
            expect(toggle_elements.eq(2).text()).toBe('Elem3');

            toggle_elements.eq(1).click();

            expect(toggle_elements.eq(0).css('display')).toBe('none');
            expect(toggle_elements.eq(1).css('display')).toBe('block');
            expect(toggle_elements.eq(2).css('display')).toBe('none');

        });
    });

    describe('toggle next element', function() {
        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element(
                '<div toggle-group>' +
                    '<h3 toggle-element="next">Heading Elem1</h3>' +
                    '<div ng-show="true">Elem1</div>' +
                    '<h3 toggle-element="next">Heading Elem2</h3>' +
                    '<div ng-show="false">Elem2</div>' +
                    '<h3 toggle-element="next">Heading Elem3</h3>' +
                    '<div ng-show="false">Elem3</div>' +
                '</div>');
            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();
        }));

        it('should show all headings and first heading next element', function() {
            var headings = elm.find('h3');
            var contents = elm.find('div');

            expect(headings.length).toBe(3);
            expect(headings.eq(0).text()).toBe('Heading Elem1');
            expect(headings.eq(1).text()).toBe('Heading Elem2');
            expect(headings.eq(2).text()).toBe('Heading Elem3');

            expect(headings.eq(0).css('display')).toBe('block');
            expect(headings.eq(1).css('display')).toBe('block');
            expect(headings.eq(2).css('display')).toBe('block');

            expect(contents.length).toBe(3);
            expect(contents.eq(0).text()).toBe('Elem1');
            expect(contents.eq(1).text()).toBe('Elem2');
            expect(contents.eq(2).text()).toBe('Elem3');

            expect(contents.eq(0).css('display')).toBe('block');
            expect(contents.eq(1).css('display')).toBe('none');
            expect(contents.eq(2).css('display')).toBe('none');
        });

        it('should show all headings and secound heading next element after click secound heading', function() {
            var headings = elm.find('h3');
            var contents = elm.find('div');

            expect(headings.length).toBe(3);
            expect(headings.eq(0).text()).toBe('Heading Elem1');
            expect(headings.eq(1).text()).toBe('Heading Elem2');
            expect(headings.eq(2).text()).toBe('Heading Elem3');

            expect(headings.eq(0).css('display')).toBe('block');
            expect(headings.eq(1).css('display')).toBe('block');
            expect(headings.eq(2).css('display')).toBe('block');

            expect(contents.length).toBe(3);
            expect(contents.eq(0).text()).toBe('Elem1');
            expect(contents.eq(1).text()).toBe('Elem2');
            expect(contents.eq(2).text()).toBe('Elem3');

            headings.eq(1).click();

            expect(contents.eq(0).css('display')).toBe('none');
            expect(contents.eq(1).css('display')).toBe('block');
            expect(contents.eq(2).css('display')).toBe('none');
        });
    });
});

describe('toggleElement multiShow', function() {
    var elm, scope;

    // load the toggleElement code
    beforeEach(module('mapproxy_gui.directives'));

    describe('default mode (toggle element)', function() {
        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element(
                '<div toggle-group mode="multiShow">' +
                    '<div ng-show="true" toggle-element>Elem1</div>' +
                    '<div ng-show="false" toggle-element>Elem2</div>' +
                    '<div ng-show="false" toggle-element>Elem3</div>' +
                '</div>');
            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();
        }));

        it('should show only the first element', function() {
            var toggle_elements = elm.find('div');

            expect(toggle_elements.length).toBe(3);
            expect(toggle_elements.eq(0).text()).toBe('Elem1');
            expect(toggle_elements.eq(1).text()).toBe('Elem2');
            expect(toggle_elements.eq(2).text()).toBe('Elem3');

            expect(toggle_elements.eq(0).css('display')).toBe('block');
            expect(toggle_elements.eq(1).css('display')).toBe('none');
            expect(toggle_elements.eq(2).css('display')).toBe('none');
        });

        it('should show first and secound element after click it', function() {
            var toggle_elements = elm.find('div');

            expect(toggle_elements.length).toBe(3);
            expect(toggle_elements.eq(0).text()).toBe('Elem1');
            expect(toggle_elements.eq(1).text()).toBe('Elem2');
            expect(toggle_elements.eq(2).text()).toBe('Elem3');

            toggle_elements.eq(1).click();

            expect(toggle_elements.eq(0).css('display')).toBe('block');
            expect(toggle_elements.eq(1).css('display')).toBe('block');
            expect(toggle_elements.eq(2).css('display')).toBe('none');

        });
    });

    describe('toggle next element', function() {
        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element(
                '<div toggle-group mode="multiShow">' +
                    '<h3 toggle-element="next">Heading Elem1</h3>' +
                    '<div ng-show="true">Elem1</div>' +
                    '<h3 toggle-element="next">Heading Elem2</h3>' +
                    '<div ng-show="false">Elem2</div>' +
                    '<h3 toggle-element="next">Heading Elem3</h3>' +
                    '<div ng-show="false">Elem3</div>' +
                '</div>');
            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();
        }));

        it('should show all headings and first heading next element', function() {
            var headings = elm.find('h3');
            var contents = elm.find('div');

            expect(headings.length).toBe(3);
            expect(headings.eq(0).text()).toBe('Heading Elem1');
            expect(headings.eq(1).text()).toBe('Heading Elem2');
            expect(headings.eq(2).text()).toBe('Heading Elem3');

            expect(headings.eq(0).css('display')).toBe('block');
            expect(headings.eq(1).css('display')).toBe('block');
            expect(headings.eq(2).css('display')).toBe('block');

            expect(contents.length).toBe(3);
            expect(contents.eq(0).text()).toBe('Elem1');
            expect(contents.eq(1).text()).toBe('Elem2');
            expect(contents.eq(2).text()).toBe('Elem3');

            expect(contents.eq(0).css('display')).toBe('block');
            expect(contents.eq(1).css('display')).toBe('none');
            expect(contents.eq(2).css('display')).toBe('none');
        });

        it('should show all headings, first and secound headings next element after click secound heading', function() {
            var headings = elm.find('h3');
            var contents = elm.find('div');

            expect(headings.length).toBe(3);
            expect(headings.eq(0).text()).toBe('Heading Elem1');
            expect(headings.eq(1).text()).toBe('Heading Elem2');
            expect(headings.eq(2).text()).toBe('Heading Elem3');

            expect(headings.eq(0).css('display')).toBe('block');
            expect(headings.eq(1).css('display')).toBe('block');
            expect(headings.eq(2).css('display')).toBe('block');

            expect(contents.length).toBe(3);
            expect(contents.eq(0).text()).toBe('Elem1');
            expect(contents.eq(1).text()).toBe('Elem2');
            expect(contents.eq(2).text()).toBe('Elem3');

            headings.eq(1).click();

            expect(contents.eq(0).css('display')).toBe('block');
            expect(contents.eq(1).css('display')).toBe('block');
            expect(contents.eq(2).css('display')).toBe('none');
        });
    });
});