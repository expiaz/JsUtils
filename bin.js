
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
