describe('sortable', function() {
    var elm, scope;

    beforeEach(module('mapproxy_gui.directives'));

    beforeEach(inject(function($rootScope, $compile) {
        elm = angular.element(
            '<div class="sort" sortable to-sort="list">' +
                '<div class="item" ng-repeat="item in sortable_array">{{item}}</div>' +
            '</div>'
            );
        scope = $rootScope;
        scope.list = ['foo', 'bar', 'foobar'];
        $compile(elm)(scope);
        scope.$digest();
    }));

    it('should have class ui-sortable', function() {
        expect(elm).toHaveClass('ui-sortable');
    });

    it('should create divs from list', function() {
        var items = elm.find('.item');
        expect(items.length).toBe(3);
        expect(items.eq(0).text()).toBe('foo');
        expect(items.eq(1).text()).toBe('bar');
        expect(items.eq(2).text()).toBe('foobar');
    });

    it('should call ui.item.index and set ui.item.data.start to return value', function() {
        var ui = {
            item: {
                _data: {},
                index: function() {
                    return 1;
                },
                data: function(k, v) {
                    if(v) {
                        this._data[k] = v;
                    } else {
                        return this._data[k];
                    }
                }
            }
        };

        elm.scope().dragStart(null, ui);

        expect(ui.item.data('start')).toBe(1);
    });

    it('should put the secound element on top', function() {
        var ui = {
            item: {
                _data: {'start': 1},
                index: function() {
                    return 0;
                },
                data: function(k, v) {
                    if(v) {
                        this._data[k] = v;
                    } else {
                        return this._data[k];
                    }
                }
            }
        };

        expect(scope.list.length).toBe(3);

        expect(scope.list[0]).toBe('foo');
        expect(scope.list[1]).toBe('bar');
        expect(scope.list[2]).toBe('foobar');

        elm.scope().dragEnd(null, ui);

        expect(scope.list.length).toBe(3);

        expect(scope.list[0]).toBe('bar');
        expect(scope.list[1]).toBe('foo');
        expect(scope.list[2]).toBe('foobar');
    });
    it('should remove the first element', function() {
        expect(scope.list.length).toBe(3);

        expect(scope.list[0]).toBe('foo');
        expect(scope.list[1]).toBe('bar');
        expect(scope.list[2]).toBe('foobar');

        elm.scope().remove(scope.list[0]);

        expect(scope.list.length).toBe(2);

        expect(scope.list[0]).toBe('bar');
        expect(scope.list[1]).toBe('foobar');
    });
});