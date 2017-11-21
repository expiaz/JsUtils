var Token = (function () {
    function Token() {
        // ex with div.class[attr=value]::first-child > a.e
        // 'div'
        this.tag = void 0;
        // '.class'
        this.id = void 0;
        this.cls = [];
        /*
        {
            name: '', // 'attr'
            value: void 0 // 'value'
        }
         */
        this.attributes = [];
        this.pseudo = void 0; // 'first-child' / not(complex)
        this.combinator = {
            type: void 0, // '>'
            to: void 0 // Token('a.e')
        };
    };

    Token.prototype.haveTag = function () {
        return !!this.tag;
    };

    Token.prototype.haveId = function () {
        return !!this.id;
    };

    Token.prototype.haveClasses = function () {
        return !!this.cls.length;
    };

    Token.prototype.haveAttributes = function () {
        return !!this.attributes.length;
    };

    Token.prototype.havePseudo = function () {
        return !!this.pseudo;
    };

    Token.prototype.haveCombinator = function () {
        return !!this.combinator.type;
    };

    return Token;
})();

/**
 * @param {string} css selector(s)
 * @return {Token[]} an abstract syntax tree of css selector(s)
 */
function cssAst (css) {

    // pour enlever les blancs consécutifs type ' > '
    var regBlanks = /\s*([+~> ,])\s*/g;
    // pour parser les selecteurs e.g 'tag#id[attr=value]:pseudo'
    var regSelector = /\s*([\w-]+)?(?:([.#])(\w[\w\d-_.]*))?(?:\[(\w[\w\d-_]*)(?:="?([^\]"]+)"?)?\])?(?:::?(\w[\w\d-]*))?\s*/;
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
            selector = selectors.substring(cursor, combinatorInfos.index);
            selectorInfos = regSelector.exec(selector);
            // selectorInfos[1] = possible tag
            // selectorInfos[2] = id|class selector
            // selectorInfos[3] = qualifier(s) for id|class
            // selectorInfos[4] = attribute
            // selectorInfos[5] = attribute value
            // selectorInfos[6] = pseudo-element
            token.tag = selectorInfos[1];
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
        // selectorInfos[1] = tag
        // selectorInfos[2] = id|class selector
        // selectorInfos[3] = qualifier(s) for id|class
        // selectorInfos[4] = attribute
        // selectorInfos[5] = attribute value
        // selectorInfos[6] = pseudo-element
        token.tag = selectorInfos[1];
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

/**
 * sort node siblings (horizontal) and/or childs (vertical) depending on their nesting from their parent and return them
 * @param {HTMLElement} node
 * @param {number|undefined} vnesting
 * @param {number|undefined} hnesting
 * @return {HTMLElement[]}
 */
function restrict(node, vnesting, hnesting){
    vnesting = vnesting || 0;
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
    return nodes;
}

/**
 * @param {HTMLElement[]} nodes
 * @param {RegExp|string} search
 */
function getEltsByClass(nodes, search){

    if(typeof search === 'string'){
        search = new RegExp('^' + search + '$');
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
        search = new RegExp('^' + search + '$');
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
        search = new RegExp('^' + search + '$');
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
 * @param {RegExp|string} value
 */
function getEltsByAttr(nodes, search , value){
    if(typeof search === 'string'){
        search = new RegExp('^' + search + '$');
    }
    if(typeof value === 'string'){
        value = new RegExp('^' + value + '$');
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
            if(value instanceof RegExp && ! attribute.value.match(value)){
                return false;
            }

            return true;
        }).length > 0;
    });
}

/**
 * @param {HTMLElement[]} nodes
 * @param {string} selector
 * @return {HTMLElement|null}
 */
function getPseudoSelector(nodes, selector) {

    if(!nodes.length){
        return null;
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
                return nodes[desc[1]] || null;
            }

            return null;
    }
}

/**
 * find HTMLElements corresponding to given token in a nodeList
 * @param {Token} token
 * @param {HTMLElement[]} nodes
 * @param {string} combinator
 * @return {HTMLElement[]} nodes the nodes that correspond at token
 */
function findToken(token, nodes, combinator) {
    if(!nodes.length){
        return nodes;
    }

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
        }, []).deduplicate();
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
        }
        nodes = token.qualifier.value.slice(1).reduce(function (acc, qualifier) {
            return getEltsByClass(nodes, qualifier);
        }, nodes);
    }

    if(token.haveAttribute()){
        nodes = getEltsByAttr(nodes, token.attribute.name, token.attribute.value);
    }

    if(token.havePseudo()){
        var pseudo = getPseudoSelector(nodes, token.pseudo);
        if(pseudo !== null) {
            nodes = [pseudo];
        } else {
            nodes = [];
        }
    }

    if(token.haveCombinator()){
        nodes = findToken(token.combinator.to, nodes, token.combinator.type);
    }

    return nodes;
}

/**
 *
 * @param {string} selector
 * @param {HTMLElement|HTMLElement[]|undefined} context
 * @return {HTMLElement[]}
 */
function find(selector, context){
    context = Array.isArray(context) ? context : [context || document];
    return cssAst(selector).map(function (token) {
        return findToken(token, context, ' ');
    }).plain();
}

/**
 *
 * @param {Token} token
 * @param {HTMLElement} root la node utilisée pour les manipulations dom en tant que parent
 * @param {'vertical'|'horizontal'|undefined} appendMode le mode d'ajout de la node vertical|horizontal
 * @return {HTMLElement}
 */
function createFromToken(token, root, appendMode) {
    if(! token.haveTag()){
        throw new Error("Sizzle::create tag missing for node creation");
    }

    appendMode = appendMode || 'vertical';

    var node = document.createElement(token.tag);

    /*
    resolution des manipulations dans l'enfant
    obligatoire car le parent n'a pas la possibilite de modifier
    ses siblings si ce n'est en passant par son parent, ainsi pour
    assure l'existance d'un parent, nosu realisons la modification
    dans l'enfant, lié à son parent
     */
    switch (appendMode) {
        case 'vertical':
            root.appendChild(node);
            break;

        case 'horizontal':
            root.addNodeAfter(node);
            break;
    }

    if(token.haveCombinator()) {
        switch(token.combinator.type) {
            case '>':
            case ' ':
                createFromToken(token.combinator.to, node, 'vertical');
                break;

            case '+':
            case '~':
                createFromToken(token.combinator.to, node, 'horizontal');
                break;
        }
    }

    if(token.haveQualifier()){
        switch (token.qualifier.type) {
            case '.':
                node.className = token.qualifier.value[0];
                break;
            case '#':
                node.id = token.qualifier.value[0];
                break;
        }
        if(token.qualifier.value.length > 1){
            node.className +=  ' ' + token.qualifier.value.slice(1).join(' ');
        }

    }

    if(token.haveAttribute()){
        node.setAttribute(token.attribute.name, token.attribute.value);
    }

    return node;
}

/**
 *
 * @param {string} selector css
 * @return {HTMLElement[]} created nodes
 */
function create(selector) {
    var root = document.createElement('div');
    cssAst(selector).forEach(function (token) {
        return createFromToken(token, root);
    });
    return Array.prototype.slice.call(root.childNodes);
}