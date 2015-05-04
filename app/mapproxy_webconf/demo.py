DEMO_CONFIG = {
    1: {
        'section': 'wms_capabilities',
        'data': {
            "url": "http://osm.omniscale.net/proxy/service?",
            "abstract": "Omniscale OpenStreetMap WMS (powered by MapProxy)",
            "layer": {
                "layers": [{
                    "name": "osm",
                    "title": "OpenStreetMap (complete map)",
                    "srs": ["EPSG:31467", "EPSG:31466", "EPSG:4326", "EPSG:3857", "EPSG:25831", "EPSG:25833", "EPSG:25832", "EPSG:31468", "EPSG:900913", "CRS:84", "EPSG:4258"],
                    "llbbox": [-180.0, -85.0511287798, 180.0, 85.0511287798]
                }, {
                    "name": "osm_roads",
                    "title": "OpenStreetMap (streets only)",
                    "srs": ["EPSG:31467", "EPSG:31466", "EPSG:4326", "EPSG:3857", "EPSG:25831", "EPSG:25833", "EPSG:25832", "EPSG:31468", "EPSG:900913", "CRS:84", "EPSG:4258"],
                    "llbbox": [-180.0, -85.0511287798, 180.0, 85.0511287798]
                }],
                "title": "Omniscale OpenStreetMap WMS",
                "srs": ["EPSG:31467", "EPSG:31466", "EPSG:4326", "EPSG:3857", "EPSG:25831", "EPSG:25833", "EPSG:25832", "EPSG:31468", "EPSG:900913", "CRS:84", "EPSG:4258"],
                "llbbox": [-180.0, -85.0511287798, 180.0, 85.0511287798]
            },
            "title": "Omniscale OpenStreetMap WMS"
        },
    },
    2: {
        "section": "sources",
        'data': {
            "supported_srs": ["EPSG:4326", "EPSG:3857", "EPSG:900913"],
            "req": {
                "url": "http://osm.omniscale.net/proxy/service?",
                "layers": ["osm"]
            },
            "type": "wms",
            "name": "osm_wms"
        },
    },
    3: {
        "section": "caches",
        'data': {
            "sources": [4],
            "name": "osm_cache",
            "grids": ["GLOBAL_WEBMERCATOR"]
        },
    },
    4: {
        "section": "layers",
        'data': {
            "name": "osm",
            "title": "Omniscale OSM WMS - osm.omniscale.net",
            "sources": [5],
        }
    }
}