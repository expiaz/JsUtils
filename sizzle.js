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
                attr.value = collect(cursor, isAlpha);
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