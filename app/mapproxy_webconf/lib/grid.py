from mapproxy.grid import tile_grid
from mapproxy.script.scales import scale_to_res, res_to_scale

from mapproxy_webconf import constants
from mapproxy_webconf import defaults

def is_valid_transformation(bbox, source_srs, dest_srs):
    """
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(25833)
    >>> bbox = [8,54,10,56]
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    True
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(25833)
    >>> bbox = [-15,54,-13,56]
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    False
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(3857)
    >>> bbox = [-180, -90, 180, 90]
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    False
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(3857)
    >>> bbox = [-180, -90, 180, 90]
    >>> bbox = source_srs.align_bbox(bbox)
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    False
    >>> source_srs = SRS(4326)
    >>> dest_srs = SRS(3857)
    >>> bbox = [-180, -90, 180, 90]
    >>> bbox = source_srs.align_bbox(bbox)
    >>> is_valid_transformation(bbox, source_srs, dest_srs)
    False
    """
    # delta in m
    delta = defaults.TRANSFORMATION_DEVIATION
    # delta in deg or m
    delta = delta * constants.M_TO_DEG_FACTOR if source_srs.is_latlong else delta

    x0, y0, x1, y1 = bbox
    p1 = (x0, y0)
    p2 = (x1, y1)

    pd1, pd2 = list(source_srs.transform_to(dest_srs, [p1, p2]))
    bbox_d = list(pd1 + pd2)
    if not float('inf') in bbox_d:
        if dest_srs.srs_code == 'EPSG:3857':
            for i in range(0, 2):
                if round(bbox_d[i], defaults.TRANSFORMATION_DECIMAL_PLACES) < defaults.BBOX_3857[i]:
                    return False
            for i in range(2, 4):
                if round(bbox_d[i], defaults.TRANSFORMATION_DECIMAL_PLACES) > defaults.BBOX_3857[i]:
                    return False
        ps1, ps2 = list(dest_srs.transform_to(source_srs, [pd1, pd2]))
        bbox_t = list(ps1 + ps2)
        if not float('inf') in bbox_t:
            for i in range(4):
                if abs(bbox[i] - bbox_t[i]) > delta:
                    return False
            return True
    return False

def calculate_tiles(name, srs, bbox, bbox_srs, origin, res=None, scales=None, dpi=constants.OGC_DPI, units=1):
    if res is None and scales is not None:
        res = [round(scale_to_res(scale, dpi, units), defaults.DECIMAL_PLACES) for scale in scales]

    tilegrid = tile_grid(srs=srs, bbox=bbox, bbox_srs=bbox_srs, res=res, origin=origin, name=name)

    result = []

    for level, res in enumerate(tilegrid.resolutions):
        tiles_in_x, tiles_in_y = tilegrid.grid_sizes[level]
        total_tiles = tiles_in_x * tiles_in_y
        result.append({
            'level': level,
            'resolution': res,
            'scale': scales[level] if scales else res_to_scale(res, dpi, units),
            'tiles_in_x': tiles_in_x,
            'tiles_in_y': tiles_in_y,
            'total_tiles': total_tiles
        })
    return result
