function h(tag, attributes, childrens){
    attributes = attributes || {};
    childrens = childrens || [];

    var pcs = tag.split('.');
    var cls = pcs.slice(1);
    pcs = pcs[0].split('#');
    var name = pcs[0] || 'div';
    var id = pcs[1] || '';

    var node = document.createElement(name);

    if(id.length) node.id = id;
    if(cls.length) node.className = cls.join(' ');

    for(var propName in attributes) {
        node.setAttribute(propName, attributes[propName]);
    }

    for(var i = 0; i < childrens.length; i++) {
        node.appendChild(typeof childrens[i] === "string"
            ? document.createTextNode(childrens[i])
            : childrens[i]
        );
    }

    return node;
}

h('div#gzg.ezgg.grzger', {'data-name': 'jean'}, ['text', h('br')])