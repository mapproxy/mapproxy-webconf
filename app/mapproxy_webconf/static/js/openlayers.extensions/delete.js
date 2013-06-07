/**
 * Delete feature control
 *
 * @class
 * @extends OpenLayers.Control
 * @param {OpenLayers.Layer.Vector} layer
 * @param options
 * @param {OpenLayers.Control.SelectFeature} [options.selectControl]
 * @param {OpenLayers.Control.ModifyFeature} [options.modifyControl]
 */
OpenLayers.Control.DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
    /**
     * Init method
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @private
     */
    initialize: function(layer, options) {
        if(options) {
            this.selectControl = options.selectControl || null;
            delete options.selectControl;
            this.modifyControl = options.modifyControl || null;
            delete options.modifyControl;
        }
        OpenLayers.Control.prototype.initialize.apply(this, [OpenLayers.Util.extend(options, {type: OpenLayers.Control.TYPE_BUTTON})]);
        this.layer = layer;
        this.layer.events.register('featureselected', this, this._toggleControlState);
        this.layer.events.register('featureunselected', this, this._toggleControlState);

        if(!this.selectControl && !this.modifyControl) {
            this.handler = new OpenLayers.Handler.Feature(
                this, layer, {click: this.clickFeature}
            );
        }
    },
    /**
     * Callback if clicked on feature without select- or modifyControl defined
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @private
     * @param {OpenLayers.Feature.Vector} feature
     */
    clickFeature: function(feature) {
        this._deleteFeature(feature);
    },
    /**
     * Delete operation
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @private
     * @param {OpenLayers.Feature.Vector} feature
     */
    _deleteFeature: function(feature) {
        if (!feature) {
            return false;
        }
        console.log(feature)
        if(this.selectControl) {
            this.selectControl.unselect(feature);
        }
        if(this.modifyControl) {
            this.modifyControl.selectControl.unselect(feature);
            this.modifyControl.deactivate();
        }
        // if feature doesn't have a fid, destroy it
        if(feature.fid == undefined) {
            this.layer.destroyFeatures([feature]);
        } else {
            feature.state = OpenLayers.State.DELETE;
            this.layer.events.triggerEvent("afterfeaturemodified", {feature: feature});
            feature.renderIntent = "select";
            if (feature.style) {
                delete feature.style;
            }
            this.layer.drawFeature(feature);
        }
        this._toggleControlState();
    },
    /**
     * Deletes given features
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @param {OpenLayers.Feature.Vector[]} features
     */
    deleteFeatures: function(features) {
        var listLength = features.length;
        for(var i=0; i<listLength; i++) {
            if(listLength == features.length) {
                this._deleteFeature(features[i]);
            } else {
                this._deleteFeature(features[0])
            }
        }
    },
    /**
     * Deletes features selected by select- and/or modifyControl
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @private
     */
    deleteSelectedFeatures: function() {
        var self = this;
        var selectedFeatures = this.layer.selectedFeatures;
        while(selectedFeatures[0]) {
            this._deleteFeature(selectedFeatures[0]);
        }
    },
    /**
     * Sets the map
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @param {OpenLayers.Map} map
     */
    setMap: function(map) {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
        OpenLayers.Element.addClass(this.panel_div, 'itemDisabled');
    },
    /**
     * Sets select control
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @param {OpenLayers.Control.SelectFeature} selectControl
     */
    setSelectControl: function(selectControl) {
        this.selectControl = selectControl;
        this.handler = null;

    },
    /**
     * Sets modify control
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @param {OpenLayers.Control.ModifyFeature} modifyControl
     */
    setModifyControl: function(modifyControl) {
        this.modifyControl = modifyControl;
        this.handler = null;
    },
    /**
     * Sets layer
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @param {OpenLayers.Layer.Vector} layer
     */
    setLayer: function(layer) {
        if(this.layer) {
            this.layer.events.unregister('featureselected', this, this._toggleControlState);
            this.layer.events.unregister('featureunselected', this, this._toggleControlState);
        }
        this.layer = layer;

        this.layer.events.register('featureselected', this, this._toggleControlState);
        this.layer.events.register('featureunselected', this, this._toggleControlState);
        this.handler = new OpenLayers.Handler.Feature(
            this, layer, {click: this.clickFeature}
        );
        this.handler.setMap(layer.map);
        this._toggleControlState();
    },
    /**
     * Called when button is triggered
     *
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     * @private
     */
    trigger: function() {
        this.deleteSelectedFeatures();
    },
    /**
     * Checks if control is activatable
     *
     * @private
     * @memberof OpenLayers.Control.DeleteFeature
     * @instance
     */
    _toggleControlState: function() {
        if(this.layer.selectedFeatures.length > 0) {
            this.activatable = true;
            if(this.panel_div) {
                OpenLayers.Element.removeClass(this.panel_div, 'itemDisabled');
            }
        } else {
            this.activatable = false;
            if(this.panel_div) {
                OpenLayers.Element.addClass(this.panel_div, 'itemDisabled');
            }
        }
    },

    CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});
