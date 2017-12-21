/**
 * Helper to create dom node
 */
var h = (function(){

    var vnodeUid = 0,
        paramArr = [],
        paramObj = {},
        p, pcs, cls, name, node, id,
        parent = HTMLElement.prototype,
        dataSupport = 'dataset' in parent;

    function setData(data, value) {
        if (dataSupport) {
            this.dataset[data] = value;
        } else {
            parent.setAttribute.call(this, 'data-' + data, value);
        }
    }

    function getData(data) {
        if (dataSupport) {
            return this.dataset[data];
        }
        return parent.getAttribute.call(this, 'data-' + data);
    }

    function setContext(key, value) {
        this.dict[key] = value;
    }

    function getContext(key, defaut) {
        return this.dict[key] || defaut;
    }

    /**
     * hyperscript (jsx) helper function to write dom manipulations
     * @param selector {string}
     * @param attrs {Object|undefined}
     * @param childs {HTMLElement[]|undefined}
     * @return {HTMLElement|HTMLElement[]}
     */
    function h(selector, attrs, childs) {
        childs = childs || paramArr,
            childs = Array.isArray(childs) ? childs : [childs],
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

        for(p in attrs.props || {}) node.setAttribute(p, attrs.props[p]);
        for(p in attrs.data || {}) node.setData(p, attrs.data[p]);
        for(p in attrs.context || {}) node.setContext(p, attrs.context[p]);
        for(p in attrs.style || {}) node.style[p] = attrs.style[p];
        for(p in attrs.on || {}) typeof attrs.on[p] === 'function' && node.addEventListener(p, attrs.on[p]);

        if(id.length) node.id = id;
        if(cls.length) node.className = (node.className.length ? node.className + ' ' : '') + cls.join(' ');

        for(var i = 0; i < childs.length; i++) node.appendChild(childs[i]);

        return node;
    }

    return h;
})();

/**
 * helper to create 'component' like groups of dom nodes
 * @param {Function} component the component to render
 * @param {Object|undefined} props arguments for the component
 * @param {HTMLElement[]|undefined} childs
 */
function H(component, props, childs){
    return props = props || {},
        props.children = childs || [],
        component(props);
}

/**
 * a copy of sizzle jquery css selector simplified (supports class, id, attribute, pseudo selector and combinators)
 */
var sizzle = (function () {
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
            this.pseudo = {
                name: void 0,
                value: void 0
            }; // 'first-child' / not(complex)
            this.combinator = {
                type: void 0, // '>'
                to: void 0 // Token('a.e')
            };
        }

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
            return !!this.pseudo.name;
        };

        Token.prototype.haveCombinator = function () {
            return !!this.combinator.type;
        };

        return Token;
    })();

    var ast = (function () {

        var tokenType = {
            TYPE: '',
            ID: '#',
            CLS: '.',

            ATTR: '[',
            PSEUDO: ':',

            CARET: '>',
            PLUS: '+',
            TILDE: '~',
            SPACE: ' ',

            COMMAS: ',',

            QUOTE: '\'',
            DBL_QUOTE: '"'
        };
        var END = '';

        var Cursor = (function () {

            function Cursor(input, position) {
                this.input = input;
                this.position = position || 0;
                this.char = this.getChar();
            }

            Cursor.prototype.isEnd = function () {
                return this.position >= this.input.length;
            };

            /**
             * @param position
             * @returns {string}
             */
            Cursor.prototype.getChar = function (position) {
                position = position || this.position;
                return this.input[position] || END;
            };

            /**
             * @param {number} nb
             */
            Cursor.prototype.move = function (nb) {
                nb = nb || 1;
                this.position += nb;

                this.char = this.getChar();
                return nb;
            };

            /**
             * @returns {string}
             */
            Cursor.prototype.prev = function () {
                return this.getChar(this.position - 1);
            };

            /**
             * @returns {string}
             */
            Cursor.prototype.now = function () {
                return this.getChar(this.position);
            };

            /**
             * @returns {string}
             */
            Cursor.prototype.next = function () {
                return this.getChar(this.position + 1);
            };

            return Cursor;
        })();

        function isBlank(char) {
            return char === ' ' || char === '\n' || char === '\t' || char === '\r';
        }

        function isLower(char) {
            // return char.charCodeAt(0) >= 97 && char.charCodeAt(0) <= 122;
            return char >= 'a' && char <= 'z';
        }

        function isUpper(char) {
            // return char.charCodeAt(0) >= 65 && char.charCodeAt(0) <= 90;
            return char >= 'A' && char <= 'Z';
        }

        function isWord(char) {
            return isUpper(char) || isLower(char);
        }

        function isDigit(char) {
            // return char.charCodeAt(0) <= 48 && char.charCodeAt(0) <= 57;
            return char >= '0' && char <= '9';
        }

        function isAlpha(char) {
            return isDigit(char) || isWord(char);
        }

        function isTag(char) {
            return isWord(char) || char === '-';
        }

        function isQualifier(char) {
            return isAlpha(char) || char === '-' || char === '_';
        }

        function isCombinator(char) {
            return char === tokenType.CARET
                || char === tokenType.PLUS
                || char === tokenType.TILDE
                || char === tokenType.SPACE;
        }

        function isDelimiter(char) {
            return char === tokenType.COMMAS;
        }

        function collect(cursor, truthlyCb) {
            var ret = '';
            while(!cursor.isEnd() && truthlyCb.call(void 0, cursor.now())) { ret += cursor.now(); cursor.move(1); }
            return ret;
        }

        function ast(css) {

            var token = new Token, cursor = new Cursor(css, 0), attr, stack = [], pending = void 0, tree = [], tmp;

            while(!cursor.isEnd()) {

                if(cursor.now() === '*'){
                    token.tag = '*';
                    cursor.move(1);
                } else {
                    token.tag = collect(cursor, isTag) || '*';
                }

                if (cursor.now() === '#') {
                    cursor.move(1);
                    token.id = collect(cursor, isQualifier);
                }
                if (cursor.now() === '.') {
                    cursor.move(1);
                    token.cls = collect(cursor, function (char) {
                        return isQualifier(char) || char === '.';
                    }).split('.');
                }

                while (cursor.now() === '[') {
                    attr = {};
                    cursor.move(1);
                    attr.name = collect(cursor, function (char) {
                        return isWord(char) || char === '-';
                    });

                    if (cursor.now() === '=') {
                        attr.type = cursor.now();
                        cursor.move(1);
                    } else if(cursor.next() === '=') {
                        attr.type = cursor.now();
                        cursor.move(2);
                    } else {
                        attr.type = '';
                    }

                    /*if (cursor.now() === '!' && cursor.next() === '=') {
                        attr.type = 'NOT';
                        cursor.move(2);
                    } else if(cursor.now() === '~' && cursor.next() === '=') {
                        attr.type = 'TILDE';
                        cursor.move(2);
                    } else if(cursor.now() === '^' && cursor.next() === '=') {
                        attr.type = 'START';
                        cursor.move(2);
                    } else if(cursor.now() === '$' && cursor.next() === '=') {
                        attr.type = 'END';
                        cursor.move(2);
                    } else if(cursor.now() === '*' && cursor.next() === '=') {
                        attr.type = 'CONTAIN';
                        cursor.move(2);
                    } else if(cursor.now() === '|' && cursor.next() === '=') {
                        attr.type = 'PIPE';
                        cursor.move(2);
                    } else if (cursor.now() === '=') {
                        attr.type = 'EQU';
                        cursor.move(1);
                    } else {
                        attr.type = 'NONE';
                    }*/

                    if (cursor.now() === '"' || cursor.now() === '\'') {
                        pending = cursor.now();
                        cursor.move(1);
                    }
                    attr.value = collect(cursor, function (char) {
                        if(pending && char === pending) return false;
                        return char !== ']';
                    });
                    if (pending) {
                        if (cursor.now() !== pending) {
                            throw new Error("Malformed selector at " + cursor.position + " expected " + pending + " got '" + cursor.now() + "'");
                        }
                        cursor.move(1);
                        pending = void 0;
                    }
                    if (cursor.now() !== ']') {
                        throw new Error("Malformed selector at " + cursor.position + " expected ']' got '" + cursor.now() + "'");
                    }
                    token.attributes.push(attr);
                    // get over ']'
                    cursor.move(1);
                }

                if (cursor.now() === ':') {
                    cursor.move(1);
                    if (cursor.now() === ':') {
                        cursor.move(1);
                    }
                    token.pseudo.name = collect(cursor, isQualifier);

                    if (cursor.now() === '(') {
                        // get over '('
                        cursor.move(1);
                        stack.push(true);
                        tmp = '';
                        collect(cursor, function (char) {
                            if (char === '(') stack.push(true);
                            else if (char === ')') stack.pop();
                            if(!stack.length) return false;
                            tmp += char;
                            return true;
                        });
                        if (stack.length) {
                            throw new Error("Malformed selector at " + cursor.position + " expected ')' got EOF");
                        }
                        // get over ')'
                        cursor.move(1);
                        token.pseudo.value = ast(tmp)[0];
                    }
                }

                // trim blanks before combinator
                collect(cursor, isBlank);

                if (isCombinator(cursor.now()) || (!cursor.isEnd() && cursor.prev() === ' ' && cursor.move(-1))) {
                    // combinators '>~+ '
                    token.combinator.type = cursor.now();
                    cursor.move(1);
                    collect(cursor, isBlank);
                    if (cursor.isEnd()) {
                        throw new Error("Malformed selector at " + cursor.position +
                            " expected selector after " + token.combinator.type + " got EOF");
                    }
                    // take the whole selector til the ',' or EOF and parse it (e.g 'div > a, a[href]' => we are 'div' and our combinator.to = a, next token is ', a[href]'
                    token.combinator.to = ast(
                        collect(cursor, function (char) {
                            return !isDelimiter(char);
                        })
                    )[0];
                }

                tree.push(token);

                // trim blanks before next selector
                collect(cursor, isBlank);

                if (isDelimiter(cursor.now())) {
                    cursor.move(1);
                    token = new Token;
                    // trim blanks after combinator
                    collect(cursor, isBlank);
                }
            }

            return tree;
        }

        return ast;
    })();

    var finder = (function () {

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
            return nodes.filter(function (node) {
                return node.className.indexOf(search) !== -1;
            });
        }

        /**
         * @param {HTMLElement[]} nodes
         * @param {RegExp|string} search
         */
        function getEltsByTag(nodes, search){
            return nodes.filter(function (node) {
                return node.nodeName.toLowerCase().indexOf(search) !== -1;
            });
        }

        /**
         * @param {HTMLElement[]} nodes
         * @param {RegExp|string} search
         */
        function getEltsById(nodes, search){
            return nodes.filter(function (node) {
                return node.id.indexOf(search) !== -1;
            });
        }

        /**
         * @param {HTMLElement[]} nodes
         * @param {RegExp|string} search
         * @param {RegExp|string} value
         */
        function getEltsByAttr(nodes, search , value){
            return nodes.filter(function (node) {
                // filter attributes by name and value according to parameters specified
                return Array.prototype.filter.call(node.attributes, function (attribute) {
                    /**
                     * @var {Attr} attribute
                     */
                    if(attribute.name.indexOf(search) === -1){
                        return false;
                    }
                    if(value && attribute.value.indexOf(value) !== -1){
                        return false;
                    }

                    return true;
                }).length > 0;
            });
        }

        /**
         * @param {HTMLElement[]} nodes
         * @param {Object} selector
         * @return {HTMLElement|null}
         */
        function getPseudoSelector(nodes, selector) {

            if(!nodes.length){
                return null;
            }

            switch (selector.name) {

                case 'first-child':
                    return nodes[0];
                    break;
                case 'last-child':
                    return nodes[nodes.length - 1];
                    break;

                case 'nth-child':
                case 'eq':
                    return nodes[selector.value] || null;
                    break;

                case 'not':
                case 'has':
                case 'contains':

                default:
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

            if(token.haveTag() && token.tag !== '*') {
                nodes = getEltsByTag(nodes, token.tag);
            }

            if(token.haveId()){
                nodes = getEltsById(nodes, token.id);
            }

            if(token.haveClasses()){
                nodes = token.cls.reduce(function (acc, className) {
                    return getEltsByClass(acc, className);
                }, nodes);
            }

            if(token.haveAttributes()){
                nodes = token.attributes.reduce(function (acc, attr) {
                    return getEltsByAttr(acc, attr.name, attr.value);
                }, nodes);
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
            var combi = ' ';
            return ast(selector).map(function (token) {
                if(token.tag === '*' && token.haveCombinator()
                    && !token.haveClasses() && !token.haveId() && !token.haveAttributes() && !token.havePseudo()) {
                    combi = token.combinator.type;
                    token = token.combinator.to;
                }
                return findToken(token, context, combi);
            }).plain();
        }

        return find;
    })();

    var creator = (function () {
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

            if(token.haveId()){
                node.id = token.id;
            }

            if(token.haveClasses()){
                node.className = token.cls.join(' ');
            }

            if(token.haveAttributes()){
                token.attributes.forEach(function (attr) { node.setAttribute(attr.name, attr.value); });
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
            ast(selector).forEach(function (token) {
                return createFromToken(token, root);
            });
            return Array.prototype.slice.call(root.childNodes);
        }

        return create;
    })();

    finder.create = creator;

    return finder;
})();

/******************
 * END SHARE
 ******************/