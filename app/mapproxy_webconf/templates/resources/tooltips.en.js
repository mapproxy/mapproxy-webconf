{
    "source_available_wms": {
        "content": "<p>Add a WMS Service as a Source to MapProxy. After adding the Layer you can drag and drop the url and the layers to your source."
    },
    "sources_name": {
        "content": "Add a name for the source."
    },
    "sources_url":{
        "content": "Add the URL from your source. Drag it from the side or use add it manually."
    },
    "sources_layers": {
        "content": "Define your layers. MapProxy will merge multiple layers from bottom to top."
    },
    "sources_manual_add_layers": {
        "content": "Add a layer manually if your WMS do not deliver a Capabilities-Document."
    },
    "sources_supported_formats": {
        "content": "Use this option to specify which image formats you source WMS supports. MapProxy only requests images in one of these formats, and will convert any image if it needs another format."
    },
    "sources_add_wms": {
        "content": "Add the URL from your WMS Source. The app will request the Capabilities-Document and will show the informations."
    },
    "sources_coverage": {
        "content": "Define the covered area of the source. The source will only be requested if there is an intersection between the requested data and the coverage. Add a boundingbox or draw a polygon."
    },
    "sources_supported_srs": {
        "content": "A list with SRSs that the WMS source supports. MapProxy will only query the source in these SRSs. It will reproject data if it needs to get data from this layer in any other SRS."
    },
    "min_max_res": {
        "content": "Limit the source to the given min and max resolution or scale."
    },
    "sources_add_srs_manual": {
        "content": "Add a coordinate system, written as EPSG:xxxx"
    },
    "grids_default_list": {
        "content": "There are three pre-defined grids all with global coverage. You cannot edit them directly, but create a copy to edit."
    },
    "grid_name": {
        "content": "Name of the grid used in WMTS URLs. The name is also used in TMS and KML URLs."
    },
    "grid_srs": {
        "content": "The spatial reference system used for the internal cache."
    },
    "grid_bbox": {
        "content": "The extent of your grid."
    },
    "grid_bbox_srs": {
        "content": "The SRS of the grid bbox."
    },
    "grid_origin": {
        "content": "The default origin (x=0, y=0) of the tile grid is the lower left corner, similar to TMS. WMTS defines the tile origin in the upper left corner."
    },
    "cache_name": {
        "content": "The name of the cache."
    },
    "cache_sources": {
        "content": "A list of data sources for this cache. MapProxy will merge multiple sources from bottom to top before they are stored on disk."
    },
    "cache_grids": {
        "content": "MapProxy supports on-the-fly transformation of requests with different SRSs. So it is not required to add an extra cache for each supported SRS."
    },
    "cache_image_format": {
        "content": "The internal image format for the cache. The default is image/png."
    },
    "cache_request_format": {
        "content": "MapProxy will try to use this format to request new tiles, if it is not set format is used. This option has no effect if the source does not support that format or the format of the source is set explicitly."
    },
    "cache_sources_list": {
        "content": "Drag your Sources into <em>Sources</em> to create a Cache."
    },
    "cache_caches_list": {
        "content": "You can also use Caches as a Source. Drag your cache into <em>Sources</em> to create a new Cache."
    },
    "cache_grids_list": {
        "content": "You can configure one or more grids for each cache. MapProxy will create one cache for each grid.."
    },
    "layers_list": {
        "content": "Here you find all layers. Use drag and drop to sort them."
    },
    "layer_name": {
        "content": "The name of the layer."
    },
    "layer_title": {
        "content": "Readable name of the layer, e.g WMS layer title."
    },
    "layer_sources": {
        "content": "A list of data sources for this layer. MapProxy will merge multiple sources from bottom to top."
    },
    "layer_caches_list": {
        "content": "Drag your Cache into <em>Sources</em>."
    },
    "layer_sources_list": {
        "content": "You can also use uncached services. Drag your sources into <em>Sources</em>."
    },
    "services_demo": {
        "content": "MapProxy comes with a demo service that lists all configured WMS and TMS layers. You can test each layer with a simple OpenLayers client."
    },
    "services_kml": {
        "content": "MapProxy supports KML version 2.2 for integration into Google Earth."
    },
    "services_tms": {
        "content": "MapProxy supports the Tile Map Service Specification from the OSGeo. The TMS service will use all configured layers that have a name and single cached source. Any layer grouping will be flattened."
    },
    "services_wms": {
        "content": "MapProxy supports ths WMS versions 1.0.0, 1.1.1 and 1.3.0."
    },
    "services_wmts": {
        "content": "The WMTS service is similar to the TMS service and will use all configured layers that have a name and single cached source. Any layer grouping will be flattened."
    },
    "service_wms_srs": {
        "content": "The srs option defines which SRS the WMS service supports."
    },
    "service_wms_metadata": {
        "content": "Metadata are used for the WMS GetCapabilities responses."
    },
    "globals_list": {
        "content": "Here you can define some internals of MapProxy and default values."
    },
    "globals_cache": {
        "content": "Here you can define some options that affect the way MapProxy create the cache."
    },
    "globals_cache_meta_size": {
        "content": "MapProxy does not make a single request for every tile but will request a large meta-tile that consist of multiple tiles. meta_size defines how large a meta-tile is. A meta_size of [4, 4] will request 16 tiles in one pass. With a tile size of 256x256 this will result in 1024x1024 requests to the source WMS."
    },
    "globals_cache_meta_buffer": {
        "content": "MapProxy will increase the size of each meta-tile request by this number of pixels in each direction. This can solve cases where labels are cut-off at the edge of tiles."
    },
    "globals_image": {
        "content": "Here you can define some options that affect the way MapProxy generates image results."
    },
    "globals_image_resampling_method": {
        "content": "<p>The resampling method used when results need to be rescaled or transformed. You can use one of nearest, bilinear or bicubic. Nearest is the fastest and bicubic the slowest. The results will look best with bilinear or bicubic. Bicubic enhances the contrast at edges and should be used for vector images.</p>"
    },
    "globals_image_paletted": {
        "content": "Enable paletted (8bit) PNG images. You should set this to false if you need 24bit PNG files."
    },
    "default_config_dpi": {
        "content": "<p>This is the resolution of the output display to use for the calculation. You need to set this to the same value of the client/server software you are using. Common values are 72 and 96. The default value is the equivalent of a pixel size of .28mm, which is around 91 DPI. This is the value the OGC uses since the WMS 1.3.0 specification."
    },
     "default_config_srs": {
        "content": "This coordinate systems are available in the app."
    },
     "default_config_add_srs": {
        "content": "Add a coordinate system for your select fields in the app,written as EPSG:xxxx."
    }
}