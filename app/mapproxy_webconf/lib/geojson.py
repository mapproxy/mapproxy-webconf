from mapproxy.grid import tile_grid, GridError
from mapproxy.srs import SRS, generate_envelope_points
from mapproxy.script.scales import scale_to_res, res_to_scale

from mapproxy_webconf import constants
from mapproxy_webconf import defaults
from mapproxy_webconf.lib.grid import is_valid_transformation, InvalidTransformationException

class ConfigGeoJSONGrid(object):
    def __init__(self, request_bbox=[], grid_bbox=[], level=None, grid_srs=None, grid_bbox_srs=None, map_srs=None, res=[], scales=[], origin='ll', units='m', dpi=None):
        self.grid_srs = SRS(grid_srs) if grid_srs else None
        self.grid_bbox_srs = SRS(grid_bbox_srs) if grid_bbox_srs else None
        self.map_srs = SRS(map_srs) if map_srs else None
        self.request_bbox = map(float, request_bbox) if request_bbox else None
        self.origin = origin
        self._res = map(float, res) if res else None
        self._scales = map(float, scales) if scales else None
        self._units = 1 if units == 'm' else constants.UNIT_FACTOR
        self._dpi = float(dpi) if dpi else constants.OGC_DPI
        self._grid_bbox = map(float, grid_bbox) if grid_bbox else None

        if self._res:
            self._num_levels = len(self._res)
        elif self._scales:
            self._num_levels = len(self._scales)
        else:
            self._num_levels = None

        try:
            self.level = int(level)
        except TypeError:
            self.level = None

    @property
    def res(self):
        if not self._res:
            if not self._scales:
                return None
            return [scale_to_res(scale, self._dpi, self._units) for scale in self._scales]
        return self._res

    @property
    def map_bbox(self):
        if not self.map_srs or not self.grid_srs:
            return None
        self.request_bbox = self.map_srs.align_bbox(self.request_bbox)
        if not is_valid_transformation(self.request_bbox, self.map_srs, self.grid_srs):
            return None

        temp = self.map_srs.transform_bbox_to(self.grid_srs, self.request_bbox)
        return temp

    @property
    def grid_bbox(self):
        _grid_bbox = None
        if self.grid_bbox_srs:
            _grid_bbox = self.grid_bbox_srs.align_bbox(self._grid_bbox)
            if self.grid_srs:
                if is_valid_transformation(_grid_bbox, self.grid_bbox_srs, self.grid_srs):
                    return self.grid_bbox_srs.transform_bbox_to(self.grid_srs, _grid_bbox)
                else:
                    raise InvalidTransformationException('Invalid transformation for grid_bbox')
        return _grid_bbox if _grid_bbox else self._grid_bbox

    @property
    def tilegrid(self):
        return tile_grid(srs=self.grid_srs, bbox=self._grid_bbox, bbox_srs=self.grid_bbox_srs, origin=self.origin, res=self.res, num_levels=self._num_levels)

    @property
    def view_bbox(self):
        gridbbox = self.grid_bbox if self.grid_bbox else self.tilegrid.bbox()
        mapbbox = self.map_bbox
        if not mapbbox:
            return gridbbox
        return [
            max(gridbbox[0], mapbbox[0]),
            max(gridbbox[1], mapbbox[1]),
            min(gridbbox[2], mapbbox[2]),
            min(gridbbox[3], mapbbox[3])
        ]

    @property
    def scales(self):
        return [res_to_scale(res, self._dpi, self._units) for res in self.tilegrid.resolutions]


def polygons(config, tiles, labeled=True):
    for tile in tiles:
        if not tile:
            continue

        tile_bbox = config.tilegrid.tile_bbox(tile, True)

        linestring = generate_envelope_points(tile_bbox, defaults.TILE_POLYGON_POINTS)
        linestring = list(config.grid_srs.transform_to(config.map_srs, linestring)) if config.map_srs and config.grid_srs else list(linestring)
        polygon = [linestring + [linestring[0]]]

        if labeled:
            xc0, yc0, xc1, yc1 = tile_bbox
            center = [xc0 + (xc1-xc0) /2, yc0 + (yc1-yc0)/2]
            center = config.grid_srs.transform_to(config.map_srs, center) if config.map_srs and config.grid_srs else center
            yield (polygon, center, tile)
        else:
            yield (polygon, None, None)


def _feature(type_, coordinates, properties=None):
    feature = {
        "type": "Feature",
        "geometry": {
            "type": type_,
            "coordinates": coordinates
        }
    }
    feature['properties'] = properties if properties else {}
    return feature

def polygon_feature(coordinates, properties=None):
    return _feature('Polygon', coordinates, properties)

def point_feature(coordinates, properties=None):
    return _feature('Point', coordinates, properties)

def features(config):
    try:
        tiles_bbox, size, tiles = config.tilegrid.get_affected_level_tiles(bbox=config.view_bbox, level=config.level)
    except GridError:
        x0, y0, x1, y1 = config.request_bbox
        return [polygon_feature([[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]], {'message': _('Given bbox can not be used with given SRS')})]

    feature_count = size[0] * size[1]
    if feature_count > defaults.MAX_GRID_FEATURES:
        polygon = generate_envelope_points(config.grid_srs.align_bbox(tiles_bbox), defaults.MESSAGE_POLYGON_POINTS)
        polygon = list(config.grid_srs.transform_to(config.map_srs, polygon)) if config.map_srs and config.grid_srs else list(polygon)
        return [polygon_feature([[list(point) for point in polygon] + [list(polygon[0])]], {'message': _("Too many tiles. Please zoom in.")})]

    if feature_count == 1:
        polygon, center, tile = list(polygons(config, tiles, True))[0]
        x, y, z = tile
        xtc, ytc = center

        xv0, yv0, xv1, yv1 = config.view_bbox
        # if tile center not visible use view center
        if(not (xv0 <= xtc and xv1 >= xtc and yv0 <= ytc and yv1 >= ytc)):
            center = [xv0 + (xv1-xv0) / 2, yv0 + (yv1-yv0) / 2]
            center = config.grid_srs.transform_to(config.map_srs, center) if config.map_srs and config.grid_srs else center
        return [
            polygon_feature(polygon),
            point_feature(center, {'x':x, 'y': y, 'z': z})
        ]


    labeled = feature_count <= defaults.MAX_LABELED_GRID_FEATURES
    features = []

    for polygon, center, tile in polygons(config, tiles, labeled):
        features.append(polygon_feature(polygon))
        if labeled:
            x, y, z = tile
            features.append(point_feature(center, {'x': x, 'y': y, 'z': z}))

    return features
