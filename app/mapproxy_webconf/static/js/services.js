var MapproxyBaseService = function(_section) {
    var _this = this;
    this._items = {};
    this._item;
    this._lastAdded;
    this._section = _section;
    this._rootScope;
    this._resource;
    this.load = function() {
        _this._resource.query({action: _this._section}, function(result) {
            if(result) {
                angular.forEach(result, function(item) {
                    _this._items[item._id] = item;
                })
                if(angular.isDefined(_this._rootScope))
                    _this._rootScope.$broadcast(_this._section + '.load_complete');
            }
        });
    };
    this.add = function(item) {
        var item = new _this._resource(item);
        if(angular.isUndefined(item._id)) {
            item.$save({action: _this._section}, function(result) {
                _this._items[result._id] = result;
                if(angular.isDefined(_this._rootScope)) {
                    _this._lastAdded = result;
                    _this._rootScope.$broadcast(_this._section + '.added');
                }
            });
        } else {
            item.$update({action: _this._section, id: item._id}, function(result) {
                _this._items[result._id] = result;
                if(angular.isDefined(_this._rootScope))
                    _this._rootScope.$broadcast(_this._section + '.updated');
            });
        }
    };
    this.remove = function(_item) {
        var item = new _this._resource(_item)
        item.$delete({action: _this._section, id: item._id}, function(result) {
            delete(_this._items[result._id]);
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.deleted');
        });
    };
    this.list = function() {
        return dict2list(_this._items);
    };
    this.byId = function(_id) {
        return angular.isDefined(_this._items[_id]) ? _this._items[_id] : false;
    };
    this.current = function(_item, copy) {
        if(_item) {
            if(copy) {
                _this._item = angular.copy(_item);
            } else {
                _this._item = _item;
            }
            if(angular.isDefined(_this._rootScope))
                _this._rootScope.$broadcast(_this._section + '.current');
        } else {
            return _this._item;
        }
    };
    this.last = function() {
        return _this._lastAdded;
    }
    this.return_func = function($rootScope, MapproxyResource) {
        _this._rootScope = $rootScope;
        _this._resource = MapproxyResource;
        _this.load();
        return _this.return_dict;
    };

    this.return_dict = {
        refresh: _this.load,
        add: _this.add,
        remove: _this.remove,
        list: _this.list,
        byId: _this.byId,
        current: _this.current,
        last: _this.last
    }
};

var MapproxyLayerService = function(_section) {
    MapproxyBaseService.call(this, _section);
    var _this = this;

    this.treeStructure = [];

    this.prepareLayer = function(store, layer, idx, parent_id) {
        if(angular.isDefined(layer._layers)) {
            angular.forEach(layer._layers, function(child_layer, _idx) {
                _this.prepareLayer(store, child_layer, _idx, layer._id);
            });
        }
        store.push({_id: layer._id, _rank: idx, _parent: parent_id})
    };

    this.tree = function(parent_id) {
        var items = _this._items
        angular.forEach(items, function(item) {
            if(item._parent == null) {
                if($.inArray(item, _this.treeStructure) == -1) {
                    _this.treeStructure.push(item);
                }
            } else {
                if(angular.isArray(items[item._parent]._layers)) {
                    if($.inArray(item, items[item._parent]) == -1) {
                        items[item._parent]._layers.push(item)
                    }
                } else {
                    items[item._parent]._layers = [item]
                }
            }
        });
        return _this.treeStructure;
    };

    this.updateStructure = function(tree) {
        var to_update = [];
        angular.forEach(tree, function(layer, idx) {
            _this.prepareLayer(to_update, layer, idx);
        });
        to_update = new _this._resource({'tree': to_update});
        to_update.$update({action: _this._section});
    };

    this.return_dict['tree'] = _this.tree;
    this.return_dict['updateStructure'] = _this.updateStructure;
};

WMSSourceService = function(_section) {
    MapproxyBaseService.call(this, _section);
    var _this = this;

    this.layerTitle = function(url, layer_name) {
        var title = false;
        angular.forEach(_this._items, function(wms) {
            if(wms.url == url) {
                angular.forEach(wms.layer.layers, function(layer) {
                    if(layer.name == layer_name) {
                        title = layer.title;
                    }
                });
            }
        });
        return title;
    };

    this.return_dict['layerTitle'] = _this.layerTitle;
};

var wmsService = new WMSSourceService('wms_capabilities');
var sourceService = new MapproxyBaseService('sources');
var cacheService = new MapproxyBaseService('caches');
var gridService = new MapproxyBaseService('grids');
var layerService = new MapproxyLayerService('layers');

angular.module('mapproxy_gui.services', ['mapproxy_gui.resources']).

service('WMSSources', wmsService.return_func).
service('MapproxySources', sourceService.return_func).
service('MapproxyCaches', cacheService.return_func).
service('MapproxyGrids', gridService.return_func).
service('MapproxyLayers', layerService.return_func);
