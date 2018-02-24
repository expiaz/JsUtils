import { init } from 'snabbdom';
import toVNode from 'snabbdom/tovnode';

import * as className from 'snabbdom/modules/class';
import props from 'snabbdom/modules/props';
import style from 'snabbdom/modules/style';
import eventlisteners from 'snabbdom/modules/eventlisteners';

/**
 *
 * @param x {*}
 * @param y {*}
 * @return {boolean}
 */
const is = (x, y) => {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y
    } else {
        return x !== x && y !== y
    }
}

/**
 *
 * @param a {Object}
 * @param b {Object}
 * @return {boolean}
 */
const shallowDiff = (a,b) => {
    if (is(a, b)) return false;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return true;
    for (var key in a) if (a.hasOwnProperty(key) && (!b.hasOwnProperty(key) || !is(a[key], b[key]))) return true;
    for (var key in b) if (b.hasOwnProperty(key) && !a.hasOwnProperty(key)) return true;
    return false;
}

/**
 *
 * @param a {*}
 * @return {*}
 */
const identity = a => a;

/**
 * my-name => myName
 * @param str {String}
 * @return {String}
 */
function camelize(str) {
    return str.replace(/([\w])[_-]([\w])/g, function (fullMatch, before, after) {
        return before + after.toUpperCase();
    })
}

/**
 * myName => my-name
 * @param str {String}
 * @return {String}
 */
function hyphenize(str) {
    return str.replace(/[A-Z]/g, '-$&');
}

/**
 * diff two dom tree and update the first one acording to the diff between them
 * @type {(oldVnode: (Element | VNode), vnode: VNode) => VNode}
 */
const patch = init([
    className,
    props,
    style,
    eventlisteners
]);

/**
 * css style declaration into an object to DOM node
 * @param stylesheet
 * @return {*}
 */
export function styled(stylesheet) {
    var declaration = stylesheet && stylesheet[0] || '';
    return declaration.split('\n').filter(function(line) {
        return line.trim().length
    }).reduce(function (css, line) {
        const [prop, val] = line.trim().split(':');
        css[camelize(prop)] = val.trim().replace(';', '');
        return css;
    }, {})
}

export { h } from 'snabbdom';

/**
 * handle the state of the application and re-render the app when it changes
 */
export default class Store {

    /**
     *
     * @param initialState {Object}
     * @param reducer {Function}
     * @constructor
     */
    constructor(initialState, reducer) {
        this.state = initialState;
        this.reducer = reducer;
    }

    /**
     *
     * @param root {HTMLElement}
     * @param app {Function}
     * @return {HTMLElement} the mount point of the app
     */
    mount(root, app) {
        this.rootNode = toVNode(root);
        this.render = app;
        this.vNode = this.render(this.state);
        patch(this.rootNode, this.vNode);
    }

    unmount() {
        while(this.rootNode.firstChild) this.rootNode.removeChild(this.rootNode.firstChild)
    }

    /**
     *
     * @param action {String|Object}
     * @param payload {Object?}
     * @return {Promise} the new state
     */
    dispatch(action, payload) {
        if (typeof action === 'object') {
            payload = action;
            action = payload.type;
        }
        if ('payload' in payload && typeof payload.payload === 'object') {
            payload = payload.payload;
        }

        const actualState = this.getState();
        return new Promise((resolve, reject) => {
            Promise.resolve(this.reducer(actualState, action, payload))
                .then(newState => {
                    if (newState !== actualState || shallowDiff(actualState, newState)) {
                        this.state = newState;
                        var newVNode = this.render(this.getState());
                        patch(this.vNode, newVNode);
                        this.vNode = newVNode;
                    }
                    resolve(this.getState());
                })
                .catch(err => reject(err))
        })
    }

    /**
     *
     * @param component {Function}
     * @param mapStateToProps {Function}
     * @return {Function}
     */
    connect(component, mapStateToProps) {
        mapStateToProps = mapStateToProps || identity;
        var self = this;

        return function (nextProps, nextChildrens) {
            const mergedProps = Object.assign({}, nextProps, mapStateToProps(self.getState()));
            return component(mergedProps, nextChildrens);
        }
    }

    /**
     *
     * @param state {Object}
     * @param action {String}
     * @param payload {Object}
     * @return {*}
     */
    reducer(state, action, payload) {
        switch (action) {
            default:
                return state;
        }
    }

    /**
     *
     * @return {Object}
     */
    getState() {
        return Object.assign({}, this.state);
    }

}