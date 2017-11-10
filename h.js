/**
 * transform a node into hyper by surcharging functions
 * @param {HTMLElement} node
 */
function buildHyperNode(node) {
    Object.defineProperty(node, 'dict', {
        value: {}
    });
    node.getAttribute = function (attribute) {
        if (attribute in node.dict) {
            return node.dict[attribute];
        }
        return node.constructor.prototype.getAttribute.call(node, attribute);
    };
    node.setAttribute = function (attribute, value) {
        // dictionnary
        if ((typeof value === 'function' || typeof value === 'object') && attribute !== 'className') {
            node.dict[attribute] = value;
            return;
        }
        // datas
        if (attribute.indexOf('data') === 0) {
            attribute = attribute.substr(4).toLowerCase();
            if (typeof node.dataset === "object") {
                node.dataset[attribute] = value;
            } else {
                node.constructor.prototype.setAttribute.call(node, 'data-' + attribute, value);
            }
            return;
        }
        // attributes
        if (attribute === 'className') {
            attribute = 'class';
            if(Array.isArray(value)){
                value = value.join(' ');
            }
            if(typeof value === 'object'){
                value = Object.keys(value).reduce(function (acc, cls) {
                    if(value[cls]) {
                        acc.push(cls);
                    }
                    return acc;
                }, []).join(' ');
            }
        }

        node.constructor.prototype.setAttribute.call(node, attribute, value);
    };
    node.appendChild = function (child) {
        if (typeof child === 'string') {
            node.constructor.prototype.appendChild.call(node, document.createTextNode(child));
            return;
        }
        node.constructor.prototype.appendChild.call(node, child);
    };
    return node;
}

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

/**
 * hyperscript (jsx) helper function to write dom manipulations
 * @param nodeName
 * @param attrs
 * @return {HTMLElement|HTMLElement[]}
 */
function h(nodeName, attrs) {
    var childs = Array.prototype.slice.call(arguments, 2).plain();

    var node;
    if(nodeName instanceof HTMLElement) {
        node = buildHyperNode(nodeName);
    } else if(typeof node === 'string') {
        // css selector
        if (! nodeName.match(/[\w+]/)) {
            var nodes = create(nodeName).map(function (node) {
                return h(node, attrs, childs);
            });
            return nodes.length > 1 ? nodes : nodes[0];
        }
        // tag name
        node = buildHyperNode(document.createElement(nodeName));
    }

    Object.keys(attrs || {}).forEach(function (attribute) {
        node.setAttribute(attribute, attrs[attribute]);
    });
    childs.forEach(function (child) {
        node.appendChild(child);
    });

    return node;
}