'use strict';

const _            = require('lodash');
const Path         = require('path');
const Promise      = require('bluebird');
const fs           = Promise.promisifyAll(require('fs-extra'));
const pr           = require('path-to-regexp');
const mix          = require('../core/mixins/mix');
const WebError     = require('./error');
const Configurable = require('../core/mixins/configurable');
const Emitter      = require('../core/mixins/emitter');

module.exports = class Theme extends mix(Configurable, Emitter) {

    constructor(viewPaths, options){
        super();

        this.options      = this.config.bind(this);
        this.setOption    = this.set.bind(this);
        this.getOption    = this.get.bind(this);

        this.options(options || {});

        this._staticPaths = new Set();
        this._routes      = new Map();
        this._builder     = null;
        this._views       = [];

        this._filters     = [];
        this._extensions  = [];
        this._globals     = {};
        this._engine      = null;

        this._errorView = {};

        this.addLoadPath(viewPaths);
        this.setErrorView('__system/error.nunj');
    }

    init(engine) {
        engine.setGlobal('theme', this);
        this._engine = engine;
        this.emit('init', engine, this._app);
    }

    render(){
        return this.engine.render(...arguments);
    }

    renderString(){
        return this.engine.renderString(...arguments);
    }

    renderError(err) {
        this.engine.setGlobal('error', err);
        return this.render(this.errorView(), {});
    }

    get engine(){
        if (!this._engine) {
            throw new Error('Theme engine instance cannot be accessed before initialisation.');
        }
        return this._engine;
    }

    addLoadPath(path) {
        path = [].concat(path);
        this._views = _.uniq(path.concat(this._views));
        return this;
    }

    loadPaths() {
        return this._views;
    }

    setErrorView(view) {
        this._errorView = view;
        return this;
    }

    errorView() {
        return this._errorView;
    }

    addStatic(path, mount) {
        this._staticPaths.add({
            path: path,
            mount: mount
        });
        return this;
    }

    static() {
        return Array.from(this._staticPaths.values());
    }

    addRoute(path, opts, build) {
        let keys = [];
        opts.path = path;
        opts.handle = opts.handle || path;
        opts.matcher = pr(path, keys);
        opts.params = build || [];
        this._routes.set(opts.handle, _.clone(opts));
        return this;
    }

    routes() {
        return Array.from(this._routes.values());
    }

    matchRoute(urlPath) {
        for (let route of this._routes.values()) {
            let match = route.matcher.exec(urlPath);
            if (match) {
                match.shift();
                let params = {};
                for (let i = 0; i < route.matcher.keys.length; i++) {
                    params[route.matcher.keys[i].name] = match[i];
                }
                return {
                    route: route,
                    params: params
                };
            }
        }
        if (urlPath === '/') {
            return {
                route: {
                    handle: '__system-index',
                    view: '__system/index.nunj',
                },
                params: {}
            };
        }
        return false;
    }

    urlFromRoute(handle, params) {
        let route = this._routes.get(handle);
        if (route) {
            if (route.redirect) {
                return route.redirect;
            }
            let compiler = pr.compile(route.path);
            return cleanUrlPath(compiler(params));
        }
        return null;
    }

}

function cleanUrlPath(urlPath) {
    return urlPath.replace(/\%2F/g, '/');
}