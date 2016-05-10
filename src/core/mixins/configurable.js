'use strict';

const _ = require('lodash');
const mixin = require('mixwith').Mixin;

module.exports = mixin((superclass) => class Configurable extends superclass {

    constructor(){
        super(...arguments);
        this._config = {};
    }

    setConfig(config) {
        this._config = config || {};
        return this;
    }

    set(config, val) {
        _.set(this._config, config, val);
        return this;
    }

    get(config, defaultVal) {
        if (_.isUndefined(config)) {
            return this._config;
        }
        return _.get(this._config, config, defaultVal || undefined);
    }

});