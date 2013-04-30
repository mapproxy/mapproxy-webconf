/*
*
* Edit Textarea - jQuery plugin
*
* Version: 0.0.1
*
* use it with $("textarea").editarea();
*/

(function( $ ) {
    var settings = {
        'indent'  : 'spaces',
        'tabwidth' : 4,
        'load': {
            'url': '/',
            'method': 'GET'
        },
        'save': {
            'url': '/',
            'method': 'PUT'
        }
    };
    var methods = {
        init : function( options ) {
            settings = $.extend(settings, options);

            this.each(function() {
                var self = this;

                // replace tabs with spaces or tabs
                $(self).on('keydown', function(e) {
                    if(e.keyCode == 9) {
                        var indent = "";
                        if (settings.indent == 'spaces') {
                            for (var i=0; i<settings.tabwidth; i++) {
                                indent += ' '
                            }
                        } else {
                            for (var i=0; i<settings.tabwidth; i++) {
                                indent += '\t'
                            }
                        }
                        var startPos = this.selectionStart;
                        this.value = this.value.substring(0, startPos) + indent + this.value.substring(this.selectionEnd);
                        this.selectionStart = startPos + settings.tabwidth;
                        return false;
                     }
                });

                // load data
                $.ajax({
                    type: settings.load.method,
                    url: settings.load.url,
                    dataType: "json",
                }).done(function( content ) {
                    var jsonContent = JSON.stringify(content);
                    $(self).val(jsonContent);
                });
            });
            return this
        },
        show : function( ) {
            return this.each(function() {
                $(this).show();
            });
        },

        hide : function( ) {
            return this.each(function() {
                $(this).hide();
            });
        },

        save : function( ) {
            return this.each(function() {
                var dataJSON;
                var data = $(this).val();
                if (data.length > 0) {
                    try {
                        dataJSON = $.parseJSON(data);
                    } catch (err) {
                        // TODO show error in app
                        dataJSON = "";
                    }
                }
                $.ajax({
                    type: settings.save.method,
                    url: settings.save.url,
                    dataType: "json",
                    data : dataJSON
                });
            });
        }
    };

    $.fn.editarea = function( method ) {
        // Method calling logic
        if ( methods[method] ) {
          return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
          return methods.init.apply( this, arguments );
        } else {
          $.error( 'Method ' +  method + ' does not exist on jQuery.editarea' );
        }

    };

})( jQuery );
