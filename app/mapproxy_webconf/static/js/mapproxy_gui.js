function include_requireds(path) {
    function require(jspath) {
        var scriptName = "gbi.js";
        var r = new RegExp("(^|(.*?\\/))(" + scriptName + ")(\\?|$)"),
            s = document.getElementsByTagName('script'),
            src, m, l = "";
        for(var i=0, len=s.length; i<len; i++) {
            src = s[i].getAttribute('src');
            if(src) {
                m = src.match(r);
                if(m) {
                    l = m[1];
                    break;
                }
            }
        }
        document.write('<script type="text/javascript" src="' + path + l + jspath+'"><\/script>');
    }

    require("helper.js");
    require("validators.js");
    require("resources.js");
    require("services.js");
    require("directives.js");
    require("controllers.js");
    require("modules/messages.js");
    require("modules/tooltips.js");
    require("modules/openlayers.js")
}
