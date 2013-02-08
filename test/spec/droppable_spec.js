describe('droppable', function() {
    var elm, scope, u1, u2, u3;

    beforeEach(module('mapproxy_gui.directives'));

    it('should have class ui-droppable', inject(function($rootScope, $compile) {
        elm = angular.element('<div droppable ng-model="drop_data"></div>');
        scope = $rootScope;
        $compile(elm)(scope);
        scope.$digest();
        expect(elm).toHaveClass('ui-droppable');
    }));

    beforeEach(inject(function($rootScope, $compile) {
            var dragged_elm1 = angular.element('<div class="drop_me" draggable item-data=\'{\"foo\": 2}\'>FooBar</div>');
            var dragged_elm2 = angular.element('<div draggable item-data=\'{\"foobar\": 23}\'>FooBar</div>');
            var dragged_elm3 = angular.element('<div class="dont_drop_me" draggable item-data=\'{\"bar\": 14}\'>FooBar</div>');

            scope = $rootScope;
            $compile(dragged_elm1)(scope);
            $compile(dragged_elm2)(scope);
            $compile(dragged_elm3)(scope);
            scope.$digest();

            //verify draggable elements
            expect(dragged_elm1).toHaveClass('ui-draggable');
            expect(dragged_elm1.attr('item-data')).toBe('{"foo": 2}');
            expect(dragged_elm2).toHaveClass('ui-draggable');
            expect(dragged_elm2.attr('item-data')).toBe('{"foobar": 23}');
            expect(dragged_elm3).toHaveClass('ui-draggable');
            expect(dragged_elm3.attr('item-data')).toBe('{"bar": 14}');

            //create dummy ui objects
            ui1 = {draggable: dragged_elm1};
            ui2 = {draggable: dragged_elm2};
            ui3 = {draggable: dragged_elm3};
    }));

    describe('default mode', function() {
        var elm_scope;

        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element('<div droppable ng-model="drop_data"></div>');

            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();

            //get child scope (tail and head are equal in this case)
            elm_scope = elm.scope().$$childHead;
        }));

        it('should have a model variable containing dropped element item-data after drop an element', function() {
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui1);

            expect(scope.drop_data).toEqual({"foo": 2});
        });

        it('should replace model-data with dropped data', function() {
            expect(scope.drop_data).toBe(undefined);

            //drop first element
            elm_scope.dropHandler(null, ui1);
            expect(scope.drop_data).toEqual({"foo": 2});

            //drop secound element
            elm_scope.dropHandler(null, ui2);
            expect(scope.drop_data).toEqual({"foobar": 23});
        });

        it('should remove model-data', function() {
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui1);
            expect(scope.drop_data).toEqual({"foo": 2});

            elm_scope.removeItem(scope.drop_data);

            expect(scope.drop_data).toBe(undefined);
        });
    });

    describe('accepts', function() {
        var elm_scope;

        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element('<div droppable ng-model="drop_data" accepts="drop_me"></div>');

            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();

            //get child scope (tail and head are equal in this case)
            elm_scope = elm.scope().$$childHead;

        }));

        it('should have accepts drop_me', function() {
            expect(elm.attr('accepts')).toBe('drop_me');
        })

        it('should only accept draggables with class drop_me', function() {
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui2);
            //elements without class should not be added
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui3);
            //elements with not accepted class should not be added
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui1);
            //elements with accepted class should be added
            expect(scope.drop_data).toEqual({"foo": 2});

        });
    });

    describe('allowArray', function() {
        var elm_scope;

        beforeEach(inject(function($rootScope, $compile) {
            elm = angular.element('<div droppable ng-model="drop_data" allow-array="true"></div>');

            scope = $rootScope;
            $compile(elm)(scope);
            scope.$digest();

            //get child scope (tail and head are equal in this case)
            elm_scope = elm.scope().$$childHead;
        }));

        it('should have allowArray', function() {
            expect(elm.attr('allow-array')).toBe("true");
        });

        it('should append droped data to model data', function() {
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui1);
            expect(scope.drop_data).toEqual([{"foo": 2}]);


            elm_scope.dropHandler(null, ui2);
            expect(scope.drop_data).toEqual([{"foo": 2}, {"foobar": 23}]);

            elm_scope.dropHandler(null, ui3);
            expect(scope.drop_data).toEqual([{"foo": 2}, {"foobar": 23}, {"bar": 14}]);

        });

        it('should remove the secound list element', function() {
            expect(scope.drop_data).toBe(undefined);

            elm_scope.dropHandler(null, ui1);
            expect(scope.drop_data).toEqual([{"foo": 2}]);


            elm_scope.dropHandler(null, ui2);
            expect(scope.drop_data).toEqual([{"foo": 2}, {"foobar": 23}]);

            elm_scope.dropHandler(null, ui3);
            expect(scope.drop_data).toEqual([{"foo": 2}, {"foobar": 23}, {"bar": 14}]);

            elm_scope.removeItem(scope.drop_data[1])

            expect(scope.drop_data).toEqual([{"foo": 2}, {"bar": 14}]);
        })
    });

    describe('change callback', function() {
        var elm_true, elm_false;

        beforeEach(inject(function($rootScope, $compile) {
            scope = $rootScope;
            scope.callback_true = function(callback, new_data) {
                callback(true);
            };
            scope.callback_false = function(callback, new_data) {
                callback(true);
            };

            elm_true = angular.element('<div droppable ng-model="drop_true_data" change-callback="callback_true(callback, new_data)"></div>');
            elm_false = angular.element('<div droppable ng-model="drop_false_data" change-callback="callback_false(callback, new_data)"></div>');


            $compile(elm_true)(scope);
            $compile(elm_false)(scope);
            scope.$digest();

            elm_true_scope = elm_true.scope().$$childHead;
            elm_false_scope = elm_false.scope().$$childHead;
        }));

        it('should do insert', function() {
            elm_true_scope.dropHandler(null, ui1);
            expect(scope.drop_true_data).toEqual({"foo": 2});
        });

        it('should not insert', function() {
            elm_false_scope.dropHandler(null, ui1);
            expect(scope.drop_false_data).toBe(undefined);
        });
    });
});
