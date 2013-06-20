/**
 * Override because if replacement is undefined in OpenLayers
 * the String "undefined" is returned
 *
 * @see OpenLayers.String.format
 */
OpenLayers.String.format = function(template, context, args) {
    if(!context) {
        context = window;
    }

    // Example matching:
    // str   = ${foo.bar}
    // match = foo.bar
    var replacer = function(str, match) {
        var replacement;

        // Loop through all subs. Example: ${a.b.c}
        // 0 -> replacement = context[a];
        // 1 -> replacement = context[a][b];
        // 2 -> replacement = context[a][b][c];
        var subs = match.split(/\.+/);
        for (var i=0; i< subs.length; i++) {
            if (i == 0) {
                replacement = context;
            }

            replacement = replacement[subs[i]];
        }

        if(typeof replacement == "function") {
            replacement = args ?
                replacement.apply(null, args) :
                replacement();
        }

        // If replacement is undefined, return the string 'undefined'.
        // This is a workaround for a bugs in browsers not properly
        // dealing with non-participating groups in regular expressions:
        // http://blog.stevenlevithan.com/archives/npcg-javascript
        //
        // in OpenLayers if replacement is undefined, string 'undefined'
        // is returned.
        if (typeof replacement == 'undefined') {
            return '';
        } else {
            return replacement;
        }
    };

    return template.replace(OpenLayers.String.tokenRegEx, replacer);
}