/**
 * ARRAYS
 */

Array.prototype.deduplicate = (
    Array.prototype.deduplicate
    || function () {
        return this.reduce(function (acc, el) {
            if(acc.indexOf(el) === -1){
                acc.push(el);
            }
            return acc;
        }, []);
    }
);

Array.prototype.plain = (
    Array.prototype.plain
    || function () {
        return this.reduce(function (plain, entry) {
            if(Array.isArray(entry)){
                plain = plain.concat(entry.plain());
            } else {
                plain.push(entry);
            }
            return plain;
        }, []);
    }
);

Array.prototype.traverse = (
    Array.prototype.traverse
    || function (cb) {
        typeof cb === "function" && this.forEach(cb);
        return this;
    }
);

Array.prototype.remove = (
    Array.prototype.remove
    || function (elt) {
        var i = this.indexOf(elt);
        if(i === -1) return;
        return this.splice(i, 1);
    }
);

Array.prototype.apply = (
    Array.prototype.apply
    || function (cb) {
        return typeof cb === "function"
            ? cb.apply(null, [this].concat(Array.prototype.slice.call(arguments, 1)))
            : this;
    }
);

Array.isArray = (
    Array.isArray
    || function (arr) {
        return arr && arr.constructor.prototype === Array.prototype;
    }
);


/**
 * STRINGS
 */

String.prototype.toCamelCase = (
    String.prototype.toCamelCase
    || function () {
        return this.replace(/([\w\d])[_-]([\w\d])/g, function (fullMatch, before, after) {
            return before + after.toUpperCase();
        });
    }
);

String.prototype.toSnakeCase = (
    String.prototype.toSnakeCase
    || function () {
        return this.replace(/[A-Z]/g, '-$&');
    }
);

String.prototype.toKebabCase = (
    String.prototype.toKebabCase
    || function () {
        return this.toSnakeCase().toLowerCase();
    }
);

String.prototype.toArray = (
    String.prototype.toArray
    || function (){
        var ret = [];
        for(var i = 0; i < this.length; i++) ret.push(this[i]);
        return ret;
    }
);


/**
 * OBJECTS
 */

Object.prototype.hasOwnProperty = (
    Object.prototype.hasOwnProperty
    || function (prop) {
        return prop in this;
    }
);

Object.defineProperty = (
    Object.defineProperty
    || function (object, name, descriptor) {
        object[name] = descriptor.value || void 0;
    }
);

Object.defineProperties = (
    Object.defineProperties
    || function (obj, descriptors) {
        Object.keys(descriptors).forEach(function (name) { Object.defineProperty(obj, name, descriptors[name]) });
    }
);

Object.prototype.forEach = (
    Object.prototype.forEach
    || function (callback) {
        for(var p in this) {
            if(this.hasOwnProperty(p)) {
                callback(p, this[p]);
            }
        }
    }
);

Object.prototype.reduce = (
    Object.prototype.reduce
    || function (callback, initial) {
        this.forEach(function (key, value) {
            initial = callback(initial, key, value);
        });
        return initial;
    }
);

Object.prototype.clone = (
    Object.prototype.clone
    || function (deep) {
        deep = !!deep;
        var self = this;
        return Object.create(
            self.__proto__,
            Object.keys(self).reduce(function (descriptor, property) {
                descriptor[property] = {
                    enumerable: true,
                    writable: true,
                    value: deep && typeof self[property] === "object" ? self[property].clone() : self[property]
                };
                return descriptor;
            }, {})
        );
    }
);

Object.prototype.assign = (
    Object.prototype.assign
    || function () {
        return Array.prototype.reduce.call(arguments, function (to, from) {
            from.forEach(function (attribute, value) {
                to[attribute] = value;
            });
            return to;
        }, this.clone());
    }
);


/**
 * ELEMENTS
 */

HTMLElement.prototype.addNodeBefore = (
    HTMLElement.prototype.addNodeBefore
    || function (node) {
        this.parentNode.insertBefore(node, this);
    }
);

HTMLElement.prototype.addNodeAfter = (
    HTMLElement.prototype.addNodeAfter
    || function (node) {
        if(this.nextSibling) {
            this.nextSibling.addNodeBefore(node);
        } else {
            this.parentNode.appendChild(node);
        }
    }
);

HTMLElement.prototype.removeChilds = (
    HTMLElement.prototype.removeChilds
    || function () {
        while(this.firstChild) this.removeChild(this.firstChild);
    }
);

HTMLElement.prototype.replaceWith = (
    HTMLElement.prototype.replaceWith
    || function (node) {
        this.parentNode.replaceChild(this, node);
    }
);


/**
 * FUNCTIONS
 */

/**
 * @param {number} delay the debouncing delay
 * @return {Function} the debounced function
 */
Function.prototype.debounce = (
    Function.prototype.debounce
    || function(delay) {
        var self = this;
        return (function () {
            var w8 = void 0;
            function debounce_wrapper() {
                var args = arguments;
                if(w8) clearTimeout(w8);
                w8 = setTimeout(function () {
                    self.apply(null, args);
                }, delay);
            }
            return debounce_wrapper;
        })();
    }
);