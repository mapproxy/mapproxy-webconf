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
    };

    require("helper.js");
    require("validators.js");
    require("resources.js");
    require("services.js");
    require("directives.js");
    require("controllers.js");
    require("modules/messages.js");
    require("modules/tooltips.js");
    require("modules/openlayers.js")
    require("modules/res_scales.js")
};

function setDefaults(app, language, project, write_config_url) {
    /* Set OpenLayers ImgPath */
    OpenLayers.ImgPath = "${ get_url('static', filepath='img/') }";

    /* app defaults */
    app.value('PAGE_LEAVE_MSG', "${ _('You have unsaved changes in this form. Realy leave the page and disgard unsaved changes?') }");
    app.value('SRS', "EPSG:4326");
    app.value('NON_TRANSPARENT_FORMATS', ["JPEG", "GIF"]);
    app.value('BACKGROUND_SERVICE_TITLE', '${ _("Background Layer") }');
    app.value('BACKGROUND_SERVICE_URL', 'http://a.maps.omniscale.net/v1/osmoscde-8a05ef58/tile');
    app.value('BACKGROUND_SERVICE_LAYER', "osm");
    app.value('BBOXES', {
        'EPSG:4326': [-180, -90, 180, 90],
        'EPSG:3857': [-20037508.342789236,-20037508.342789236,20037508.342789236,20037508.342789236],
        'EPSG:900913': [-20037508.342789236,-20037508.342789236,20037508.342789236,20037508.342789236]
    });

    app.value('CREATE_CONFIG_URL', write_config_url);

  /* OpenLayers directive defaults */
    angular.module('mapproxy_gui.openlayers').value('GRID_AS_GEOJSON_URL', "${ get_url('grid_as_geojson') }");
    angular.module('mapproxy_gui.openlayers').value('LAYERSWITCHER_TEMPLATE_URL', "${ get_url('angular_template', filename='layerswitcher') }");
    angular.module('mapproxy_gui.openlayers').value('OPENLAYERSMAP_TEMPLATE_URL', "${ get_url('angular_template', filename='openlayersmap') }");
    angular.module('mapproxy_gui.openlayers').value('DPI', 72);
    angular.module('mapproxy_gui.openlayers').value('NUM_ZOOM_LEVELS', 16);
    angular.module('mapproxy_gui.openlayers').value('GRID_START_LEVEL', 0);
    angular.module('mapproxy_gui.openlayers').value('GRID_MAX_LEVEL', 20);
    angular.module('mapproxy_gui.openlayers').value('GRID_EXTENSION_TEMPLATE_URL', "${ get_url('angular_template', filename='openlayers_gridextension.html') }");
    angular.module('mapproxy_gui.openlayers').value('TOOLBAR_EXTENSION_TEMPLATE_URL', "${ get_url('angular_template', filename='openlayers_toolbar_extension.html') }");

  /* Message directive defaults */
    angular.module('mapproxy_gui.messages').value('FADEOUT_DELAY', 2000);

  /* ResScale directive defaults */
    angular.module('mapproxy_gui.resScales').value('CONVERT_URL', "${ get_url('convert_res_scales') }");
    angular.module('mapproxy_gui.resScales').value('TEMPLATE_URL', "${ get_url('angular_template', filename='res_scales.html') }");

  /* Other directive defaults */
    angular.module('mapproxy_gui.directives').value('EDITAREA_TEMPLATE_URL', "${ get_url('angular_template', filename='editarea') }");
    angular.module('mapproxy_gui.directives').value('EXTENDABLE_INPUT_LIST_TEMPLATE_URL', "${ get_url('angular_template', filename='extendable_input_list') }");

    app.run(function($rootScope, tooltipMapper, TranslationService) {
        $rootScope.LANGUAGE = language;
        $rootScope.PROJECT = project;

        tooltipMapper.loadDict("${ get_url('resource', filename='tooltips.%s.js' % language) }");
        TranslationService.setDict(translationsDict);
    });

    /* set placeholder text for ie9 and browser who not support placeholder */
    $(document).ready(function() {
        $('input, textarea').placeholder();
    })
}