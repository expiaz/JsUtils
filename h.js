var h = (function(){

    function setData(data, value) {
        if (dataSupport) {
            this.dataset[data] = value;
        } else {
            parent.setAttribute.call(this, 'data-' + data, value);
        }
    }

    function getData(data) {
        if (dataSupport) {
            return this.dataset[attribute];
        }
        return parent.getAttribute.call(this, 'data-' + data);
    }

    function setContext(key, value) {
        this.dict[key] = value;
    }

    function getContext(key, defaut) {
        return this.dict[key] || defaut;
    }

    var vnodeUid = 0,
        paramArr = [],
        paramObj = {},
        p, pcs, cls, name, node, id,
        dataSupport = 'dataset' in HTMLElement.prototype,
        parent = HTMLElement.prototype;

    /**
     * hyperscript (jsx) helper function to write dom manipulations
     * @param selector {string}
     * @param attrs {Object|undefined}
     * @param childs {HTMLElement[]|undefined}
     * @return {HTMLElement|HTMLElement[]}
     */
    function h(selector, attrs, childs) {
        childs = childs || paramArr,
            attrs = attrs || paramObj,
            pcs = selector.split('.'),
            cls = pcs.length > 1 && pcs.slice(1) || paramArr,
            pcs = pcs[0].split('#'),
            name = pcs[0] || 'div',
            id = pcs[1] || '',
            node = document.createElement(name);

        node.dict = {};
        node.uid = ++vnodeUid;
        node.setData = setData;
        node.getData = getData;
        node.setContext = setContext;
        node.getContext = getContext;
        node.getAttribute = function (attribute) {
            if (attribute in this.dict) {
                return this.getContext(attribute);
            }
            return parent.getAttribute.call(this, attribute);
        };
        node.setAttribute = function (attribute, value) {
            // class
            if (attribute === 'className' || attribute === 'class') {
                attribute = 'class';
                if(Array.isArray(value)){
                    value = value.join(' ');
                }
                if(typeof value === 'object'){
                    value = Object.keys(value).reduce(function (acc, cls) {
                        value[cls] && acc.push(cls);
                        return acc;
                    }, []).join(' ');
                }
            }

            parent.setAttribute.call(this, attribute, value);
        };
        node.appendChild = function (child) {
            if (typeof child === 'string') {
                parent.appendChild.call(this, document.createTextNode(child));
                return;
            }
            parent.appendChild.call(this, child);
        };

        if(id.length) node.id = id;
        if(cls.length) node.className = cls.join(' ');

        for(p in attrs.props || {}) node.setAttribute(p, attrs.props[p]);
        for(p in attrs.data || {}) node.setData(p, attrs.data[p]);
        for(p in attrs.context || {}) node.setContext(p, attrs.context[p]);
        for(p in attrs.style || {}) node.style[p] = attrs.style[p];
        for(var p in attrs.on || {}) typeof attrs.on[p] === 'function' && node.addEventListener(p, attrs.on[p]);

        for(var i = 0; i < childs.length; i++) node.appendChild(childs[i]);

        return node;
    }

    return h;
})();

/**
 * transform an array with different level of nesting into one by merging nestings with first level [1, [2, [3]] => [1,2,3]
 * @param arr
 * @returns Array
 */
function toPlainArray(arr){
    return arr.reduce(function (plain, entry) {
        if(Array.isArray(entry)){
            plain = plain.concat(toPlainArray(entry));
        } else {
            plain.push(entry);
        }
        return plain;
    }, []);
}

function collect(str, from, truthlyCb) {
    var ret = '';
    from = from < 0 ? 0 : from;
    while(truthlyCb.call(void 0, str[from]) && from < str.length) { ret += str[from++]; }
    return ret;
}

function isLower(char){
    // return char.charCodeAt(0) >= 97 && char.charCodeAt(0) <= 122;
    return char >= 'a' && char <= 'z';
}

function isUpper(char){
    // return char.charCodeAt(0) >= 65 && char.charCodeAt(0) <= 90;
    return char >= 'A' && char <= 'Z';
}

function isWord(char){
    return isUpper(char) || isLower(char);
}

function isDigit(char){
    // return char.charCodeAt(0) <= 48 && char.charCodeAt(0) <= 57;
    return char >= '0' && char <= '9';
}

function isAlpha(char){
    return isDigit(char) || isWord(char);
}

function h_tokenize(nodeName, attrs, childs) {
    childs = childs || []; //toPlainArray(Array.prototype.slice.call(arguments, 2))
    attrs = attrs || {};

    var node, cursor = 0,
        name = collect(nodeName, cursor, function (char) {
            return isAlpha(char);
        }),
        id = (cursor = nodeName.indexOf('#')) !== -1 && collect(nodeName, cursor + 1, function (char) {
            return char > isAlpha(char) || char === '-';
        }) || '',
        cls = (cursor = nodeName.indexOf('.')) !== -1 && collect(nodeName, cursor + 1, function (char) {
            return isAlpha(char) || char === '-' || char === '.';
        }) || '';


    node = document.createElement(name.length && name || 'div');
    if(id.length) node.id = id;
    if(cls.length) node.className = cls.indexOf('.') !== -1 ? cls.split('.').join(' ') : cls;

    if(typeof attrs === "object") for(var p in attrs) attrs.hasOwnProperty(p) && node.setAttribute(p, attrs[p]);
    if(Array.isArray(childs)) for(var i = 0; i < childs.length; i++) node.appendChild(childs[i]);

    return node;
}

function h_parser(nodeName, attrs, childs) {
    childs = childs || []; //toPlainArray(Array.prototype.slice.call(arguments, 2))
    attrs = attrs || {};

    var node, cursor = 0, name = '', cls = '', id = '';

    while(nodeName[cursor] > 'A') name += nodeName[cursor++];
    if(nodeName[cursor] === '#') while(nodeName[++cursor] > '.') id += nodeName[cursor];
    if(++cursor < nodeName.length) cls = nodeName.substring(cursor);

    node = document.createElement(name.length && name || 'div');
    if(id.length) node.id = id;
    if(cls.length) node.className = cls.indexOf('.') !== -1 ? cls.split('.').join(' ') : cls;

    if(typeof attrs === "object") for(var p in attrs) attrs.hasOwnProperty(p) && node.setAttribute(p, attrs[p]);
    if(Array.isArray(childs)) for(var i = 0; i < childs.length; i++) node.appendChild(childs[i]);

    return node;
}

var n, t;
n = 1000 * 100;
t = +new Date;
for(var i = 0; i < n; i++) {
    h('a#gezgzeg.gezgryzgr.fze.fezf.fer.e', {}, [1,2,3].map(function (e) { return h('div', {props: {className: e}}) }));
}
console.log(+new Date - t);

