var Token = (function () {
    function Token() {
        // ex with div.class[attr=value]::first-child > a.e
        // 'div'
        this.tag = void 0;
        // '.class'
        this.qualifier = {
            type: void 0, // '.'
            value: [] // 'class'
        };
        this.attribute = {
            name: '', // 'attr'
            value: void 0 // 'value'
        };
        this.pseudo = void 0; // 'first-child'
        this.combinator = {
            type: void 0, // '>'
            to: void 0 // Token('a.e')
        };
    };

    Token.prototype.setQualifier = function (type, qualifier) {
        if(!qualifier) {
            return;
        }

        type = type || '';
        this.qualifier.type = type;
        // on peut chainer les classes pour préciser
        this.qualifier.value = qualifier.split('.');
    };

    Token.prototype.haveTag = function () {
        return !!this.tag;
    };

    Token.prototype.haveQualifier = function () {
        return typeof this.qualifier.type === 'string';
    };

    Token.prototype.haveAttribute = function () {
        return !!this.attribute.name;
    };

    Token.prototype.havePseudo = function () {
        return !!this.pseudo;
    };

    Token.prototype.haveCombinator = function () {
        return !!this.combinator.type;
    };

    return Token;
})();

function cssAst (css) {

    // pour enlever les blancs consécutifs type ' > '
    var regBlanks = /\s*([+~> ,])\s*/g;
    // pour parser les selecteurs e.g 'tag#id[attr=value]:pseudo'
    var regSelector = /\s*(\w+)?(?:([.#])(\w[\w\d-_.]*))?(?:\[(\w[\w\d-_]*)(?:="?([^\]"]+)"?)?\])?(?:::?(\w[\w\d-]*))?\s*/;
    // pour parser les expression e.g 'selector > selector + selector'
    var regCombinator = /([+~> ])/g;

    // delete blanks
    css = css.replace(regBlanks, function (fullMatch, combinator) {
        return combinator;
    });
    // split in expressions separated by commas
    var expressions = css.split(',');

    // pour chaque expression e.g 'div, a, #nan' en fait 3
    return expressions.reduce(function (ast, selectors) {

        var combinatorInfos;
        var selectorInfos;
        // current parsed selector
        var selector;
        // current position on the selectors
        var cursor = 0;
        // first token
        var token = new Token();
        // is there a combinator waiting for his combined
        var pendingCombinator = void 0;
        // first token in combinators selectors e.g. 'a + b > c' head will be a
        var head = token;

        // pour chaque selecteur combiné e.g 'div > a ~ article' en fait 3
        while (combinatorInfos = regCombinator.exec(selectors)) {
            // combinatorInfos[1] = combinator type
            token.combinator.type = combinatorInfos[1];

            //il n'y a peut être pas de combinator
            // on extrait le selecteur e.g '#div[a=b]:pseudo'
            selector = selectors.substring(cursor);
            selectorInfos = regSelector.exec(selector);
            // selectorInfos[1] = possible tag
            // selectorInfos[2] = id|class selector
            // selectorInfos[3] = qualifier(s) for id|class
            // selectorInfos[4] = attribute
            // selectorInfos[5] = attribute value
            // selectorInfos[6] = pseudo-element
            if(selectorInfos[3]){
                token.tag = selectorInfos[1];
                token.setQualifier(selectorInfos[2], selectorInfos[3]);
            } else {
                token.setQualifier('', selectorInfos[1]);
            }
            token.setQualifier(selectorInfos[2], selectorInfos[3]);
            token.attribute.name = selectorInfos[4];
            token.attribute.value = selectorInfos[5];
            token.pseudo = selectorInfos[6];

            if (pendingCombinator) {
                // un selecteur attendait son selecteur combiné e.g 'a > b' nous sommes b
                pendingCombinator.combinator.to = token;
            }
            // le selecteur va attendre son selecteur combiné s'il en a un e.g 'a > b' nous sommes a
            pendingCombinator = token;

            token = new Token();

            // move cursor after this match
            cursor = combinatorInfos.index + combinatorInfos[0].length;
        }

        //il n'y a peut être pas de combinator
        // on extrait le selecteur e.g '#div[a=b]:pseudo'
        selector = selectors.substring(cursor);
        selectorInfos = regSelector.exec(selector);
        // selectorInfos[1] = possible tag
        // selectorInfos[2] = id|class selector
        // selectorInfos[3] = qualifier(s) for id|class
        // selectorInfos[4] = attribute
        // selectorInfos[5] = attribute value
        // selectorInfos[6] = pseudo-element
        if(selectorInfos[3]){
            token.tag = selectorInfos[1];
            token.setQualifier(selectorInfos[2], selectorInfos[3]);
        } else {
            token.setQualifier('', selectorInfos[1]);
        }
        token.setQualifier(selectorInfos[2], selectorInfos[3]);
        token.attribute.name = selectorInfos[4];
        token.attribute.value = selectorInfos[5];
        token.pseudo = selectorInfos[6];

        // il n'y a plus de combinator mais celui d'avant attend toujours le siens 'a > b' pending a attend b, nous allons recup b
        if (pendingCombinator) {
            pendingCombinator.combinator.to = token;
        }

        // on ajoute le token a l'ast
        ast.push(head);

        return ast;

    }, []);
}

function toCamelCase(str) {
    return str.replace(/([\w\d])[_-]([\w\d])/g, function (fullMatch, before, after) {
        return before + after.toUpperCase();
    })
}

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
)

function restrict(node, vnesting, hnesting){
    vnesting = vnesting || -1;
    hnesting = hnesting || 0;

    var nodes;
    var roots = 0;

    if(hnesting !== 0) {
        nodes = [];
        var next = node;
        while((next = next.nextSibling) && hnesting) {
            if(next instanceof HTMLElement){
                --hnesting;
                nodes.push(next);
            }
        }
    } else {
        nodes = [node];
        roots = 1;
    }

    for(var i = 0; i < nodes.length && vnesting--; i++){
        nodes = nodes.concat(Array.prototype.filter.call(nodes[i].childNodes, function (node) {
            return node instanceof HTMLElement;
        }));
    }
    nodes = roots && nodes.slice(roots) || nodes;

    // deduplicate
    return nodes.deduplicate();
}

/**
 * @param {HTMLElement[]} nodes
 * @param {RegExp|string} search
 */
function getEltsByClass(nodes, search){

    if(typeof search === 'string'){
        search = new RegExp(search);
    }
    if(! search instanceof RegExp){
        return [];
    }

    return nodes.filter(function (node) {
        return node.className.match(search);
    });
}

/**
 * @param {HTMLElement[]} nodes
 * @param {RegExp|string} search
 */
function getEltsByTag(nodes, search){
    if(typeof search === 'string'){
        search = new RegExp(search);
    }
    if(! search instanceof RegExp){
        return [];
    }

    return nodes.filter(function (node) {
        return node.nodeName.toLowerCase().match(search);
    });
}

/**
 * @param {HTMLElement[]} nodes
 * @param {RegExp|string} search
 */
function getEltsById(nodes, search){
    if(typeof search === 'string'){
        search = new RegExp(search);
    }
    if(! search instanceof RegExp){
        return [];
    }

    return nodes.filter(function (node) {
        return node.id.match(search);
    });
}

/**
 * @param {HTMLElement[]} nodes
 * @param {RegExp|string} search
 */
function getEltsByAttr(nodes, search , value){
    if(typeof search === 'string'){
        search = new RegExp(search);
    }
    if(typeof value === 'string'){
        value = new RegExp(value);
    }
    if(! search instanceof RegExp){
        return [];
    }

    return nodes.filter(function (node) {
        // filter attributes by name and value according to parameters specified
        return Array.prototype.filter.call(node.attributes, function (attribute) {
            /**
             * @var {Attr} attribute
             */
            if(! attribute.name.match(search)){
                return false;
            }
            if(value && ! attribute.value.match(value)){
                return false;
            }

            return true;
        }).length > 0;
    });
}

/**
 *
 * @param {HTMLElement} node
 * @param string selector
 * @return {HTMLElement[]}
 */
function getPseudoSelector(nodes, selector) {

    if(!nodes.length){
        return nodes;
    }

    switch (selector) {
        case 'first-child':
            return nodes[0];
            break;
        case 'last-child':
            return nodes[nodes.length - 1];
            break;
        default:
            var desc;
            if(desc = selector.match(/^nth-child\((\d+)\)$/)){
                return nodes[desc[1]] || [];
            }
    }

    // fallback to HTMLElement props
    var node = nodes[0];
    selector = toCamelCase(selector);
    if(selector in node){
        return node[selector];
    }

    return null;
}

/**
 *
 * @param {Token} token
 * @param {HTMLElement[]} nodes
 */
function findToken(token, nodes, combinator) {
    if(combinator){
        var vnesting = void 0, hnesting = void 0;
        switch (combinator){
            case '+':
                hnesting = 1;
                break;
            case '~':
                hnesting = -1;
                break;

            case '>':
                vnesting = 1;
                break;
            case ' ':
                vnesting = -1;
                break;

            default:
                break;
        }
        nodes = nodes.reduce(function (acc, node) {
            return acc.concat(restrict(node, vnesting, hnesting));
        }, []);
    }

    if(token.haveTag()) {
        nodes = getEltsByTag(nodes, token.tag);
    }

    if(token.haveQualifier()){
        switch (token.qualifier.type){
            case '.':
                nodes = getEltsByClass(nodes, token.qualifier.value[0]);
                break;
            case '#':
                nodes = getEltsById(nodes, token.qualifier.value[0]);
                break;
            case '':
                nodes = getEltsByTag(nodes, token.qualifier.value[0]);
        }
        nodes = token.qualifier.value.slice(1).reduce(function (acc, qualifier) {
            return getEltsByClass(nodes, qualifier);
        }, nodes);
    }

    if(token.haveAttribute()){
        nodes = getEltsByAttr(nodes, token.attribute.name, token.attribute.value);
    }

    if(token.havePseudo()){
        nodes = getPseudoSelector(nodes, token.pseudo);
    }

    if(token.haveCombinator()){
        nodes = findToken(token.combinator.to, nodes, token.combinator.type);
    }

    return nodes;
}

/**
 * @param {Token[]} ast
 * @param {HTMLElement} context
 */
function findAst(ast, context) {
    context = context || document;
    return ast.map(function (token) {
        return findToken(token, Array.prototype.slice.call(context.childNodes), ' ');
    }).plain().deduplicate();
}

function $(selector, context){
    context = context || document;
    return findAst(cssAst(selector), context);
}