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

String.prototype.toCamelCase = (
    String.prototype.toCamelCase
    || function () {
        return this.replace(/([\w\d])[_-]([\w\d])/g, function (fullMatch, before, after) {
            return before + after.toUpperCase();
        });
    }
);

String.prototype.toSnakeCase = (
    String.prototype.toCamelCase
    || function () {
        return this.replace(/[A-Z]/g, '-$&').toLowerCase();
    }
);

String.prototype.toKebabCase = (
    String.prototype.toCamelCase
    || function () {
        return this.toSnakeCase().toLowerCase();
    }
);

Object.prototype.hasOwnProperty = (
    Object.prototype.hasOwnProperty
    || function (prop) {
        return prop in this;
    }
);

Object.defineProperty = (
    Object.defineProperty
    || function (object, name, descriptor) {
        object[name] = descriptor.value || void 0;
    }
);

Object.defineProperties = (
    Object.defineProperties
    || function (obj, descriptors) {
        Object.keys(descriptors).forEach(function (name) { Object.defineProperty(obj, name, descriptors[name]) });
    }
);

Array.isArray = (
    Array.isArray
    || function (arr) {
        return arr && arr.constructor.prototype === Array.prototype;
    }
);

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