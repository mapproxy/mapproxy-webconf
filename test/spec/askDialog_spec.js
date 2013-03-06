describe('askDialog', function() {
    var elm, scope, dialog_id;

    beforeEach(module('mapproxy_gui.directives'));

    beforeEach(inject(function($rootScope, $compile) {
        scope = $rootScope;
        scope.data = 'test_data';
        scope.doSth = function(foo) {
            console.log(foo)
            scope.new_data = foo;
        };
        elm = angular.element('<div><button ask-dialog dialog-title="Confirm" dialog-text="question" callback="doSth(data)">text</button></div>');
        $compile(elm)(scope);
        scope.$digest();
        elm_scope = elm.scope().$$childTail;
        dialog_id = '#dialog_' + elm_scope.$id;
    }));

    it('should add hidden dialog div', function() {
        var dialog = elm.find(dialog_id);

        expect(dialog.length).toBe(1);
        expect(dialog.css('display')).toBe('none');
    });

    it('should have defined dialog options', function() {
        var dialog = elm.find(dialog_id);
        expect(dialog.attr('title')).toBe('Confirm')

        var dialog_text = dialog.find('p');
        expect(dialog_text.text()).toBe('question');
    });

    it('should show jquery-ui dialog onclick and close it', function() {
        var dialog = elm.find(dialog_id);
        var button = elm.find('button')

        expect(dialog.css('display')).toBe('none');

        button.click();

        expect(dialog.css('display')).toNotBe('none');

        expect(dialog.parent()).toHaveClass('ui-dialog');

        dialog.dialog('close');

        expect(dialog.parent().css('display')).toBe('none');
    });
});