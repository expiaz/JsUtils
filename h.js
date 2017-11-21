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
        parent = HTMLElement.prototype,
        dataSupport = 'dataset' in parent;

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
        for(p in attrs.on || {}) typeof attrs.on[p] === 'function' && node.addEventListener(p, attrs.on[p]);

        for(var i = 0; i < childs.length; i++) node.appendChild(childs[i]);

        return node;
    }

    return h;
})();

