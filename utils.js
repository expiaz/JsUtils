/**
 * clone an object
 * @param {Object} from the model
 * @returns {Object} the clone
 */
function clone(from) {
    return Object.create(
        from.constructor.prototype,
        Object.keys(from).reduce(function (descriptor, property) {
            descriptor[property] = {
                enumerable: true,
                writable: true,
                value: from[property]
            };
            return descriptor;
        }, {})
    );
}

/**
 * inherits an object from another
 * @param child
 * @param parent
 * @returns {*}
 */
function inherit(child, parent) {
    for (var p in parent) if (parent.hasOwnProperty(p)) child[p] = parent[p];
    child.prototype = parent.prototype;
    child.prototype.constructor = child;
    return child;
}

function ajaxPromise() {

}

var LinkedList = (function () {

    /**
     * @param {Array|undefined} base
     * @constructor
     */
    function LinkedList(base){
        this.head = void 0;
        this.queue = void 0;
        Array.prototype.forEach.call(base || [], function (item) {
            this.add(item);
        }.bind(this));
    }

    LinkedList.prototype.Entry = (function () {

        function Entry(value) {
            this.value = value;
            /**
             * @var {Entry|undefined} next
             */
            this.next = void 0;
        }

        Entry.prototype.hasNext = function () {
            return !!this.next;
        }

        return Entry;

    })();

    LinkedList.prototype.add = function (item) {
        if(! this.head){
            this.head = this.queue = new this.Entry(item);
        } else {
            this.queue = this.queue.next = new this.Entry(item);
        }
    }

    return LinkedList;

})();

/**
 * JQ like
 */

var Sizzle = (function () {

    function Sizzle(selector, root) {
        this.root = root || document.body;
        this.selector = selector;
        this.pieces = Sizzle.parser.parse(selector);
        this.results = [];
    }

    Sizzle.prototype.Parser = (function () {

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

            COMMAS: ','
        };
        var END = '';
        var wordReg = /\w/;
        var alphaReg = /[\w\d]/;

        function Parser() {

        }

        Parser.prototype.Token = (function () {
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

                type = type || '';
                this.qualifier.type = type;
                // si c'est une classe ou un tag, alors on peut chainer les classes pour préciser
                if(type === '.' || type === ''){
                    this.qualifier.value = qualifier.split('.');
                } else {
                    this.qualifier.value = [qualifier];
                }
            };

            Token.prototype.haveTag = function () {
                return !!this.tag;
            };

            Token.prototype.haveQualifier = function () {
                return !!this.qualifier.type;
            };

            Token.prototype.haveWord = function () {
                return !!this.word;
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

        Parser.prototype.Cursor = (function () {

            function Cursor(input, position) {
                this.input = input;
                this.position = position || 0;
                this.char = this.getChar();
            }

            Cursor.prototype.isEnd = function () {
                return this.now() === END;
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

        Parser.prototype.parse = function (css) {

            /*// types de token
            var tokenType = {
                qualifier: {
                    TYPE: '',
                    ID: '#',
                    CLS: '.',
                },

                ATTR: '[',
                PSEUDO: ':',

                combinator: {
                    CARET: '>',
                    PLUS: '+',
                    TILDE: '~',
                    SPACE: ' ',
                },

                delimiter: {
                    COMMAS: ','
                }
            };

            var regSelector = new RegExp(
                '\\s*([' +
                Object.values(tokenType.qualifier).join('') +
                '])?(\\w[\\w\\d]*)?(?:\\[(\\w[^=]*)(?:=(\\w[^\\]]*))?\\])?(?::(\\w[\\w\\d-]*))?\\s*'
            );
            var regCombinator = new RegExp(
                '\\s*([' +
                Object.values(tokenType.combinator).join('') +
                '])\\s*',
                'g'
            );
            var regDelimiter = new RegExp(
                '[' + Object.values(tokenType.delimiter).join('') + ']'
            );

            var expression = css.split(regDelimiter);*/

            // pour enlever les blancs consécutifs type ' > '
            var regBlanks = /\s*([+~> ,])\s*/g;
            // pour parser les selecteurs e.g 'tag#id[attr=value]:pseudo'
            var regSelector = /\s*(\w+)?(?:([.#])(\w[\w\d-_.]*))?(?:\[(\w[\w\d-_]*)(?:=([^\]]+))?\])?(?:::?(\w[\w\d-]*))?\s*/;
            // pour parser les expression e.g 'selector > selector + selector'
            var regCombinator = /([+~> ])/g;

            // delete blanks
            css = css.replace(regBlanks, function (fullMatch, combinator) {
                return combinator;
            });
            // split in expressions separated by commas
            var expressions = css.split(',');

            var self = this;
            // pour chaque expression e.g 'div, a, #nan' en fait 3
            return expressions.reduce(function (ast, selectors) {

                var combinatorInfos;
                var selectorInfos;
                // current parsed selector
                var selector;
                // current position on the selectors
                var cursor = 0;
                // first token
                var token = new self.Token();
                // is there a combinator waiting for his combined
                var pendingCombinator = void 0;
                // first token in combinators selectors e.g. 'a + b > c' head will be a
                var head = token;

                // pour chaque selecteur combiné e.g 'div > a ~ article' en fait 3
                while(combinatorInfos = regCombinator.exec(selectors)){
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
                    token.tag = selectorInfos[1];
                    token.setQualifier(selectorInfos[2], selectorInfos[3]);
                    token.attribute.name = selectorInfos[4];
                    token.attribute.value = selectorInfos[5];
                    token.pseudo = selectorInfos[6];

                    if(pendingCombinator){
                        // un selecteur attendait son selecteur combiné e.g 'a > b' nous sommes b
                        pendingCombinator.combinator.to = token;
                    }
                    // le selecteur va attendre son selecteur combiné s'il en a un e.g 'a > b' nous sommes a
                    pendingCombinator = token;

                    token = new self.Token();

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
                token.tag = selectorInfos[1];
                token.setQualifier(selectorInfos[2], selectorInfos[3]);
                token.attribute.name = selectorInfos[4];
                token.attribute.value = selectorInfos[5];
                token.pseudo = selectorInfos[6];

                // il n'y a plus de combinator mais celui d'avant attend toujours le siens 'a > b' pending a attend b, nous allons recup b
                if(pendingCombinator){
                    pendingCombinator.combinator.to = token;
                }

                // on ajoute le token a l'ast
                ast.push(head);

                return ast;

            }, []);

            /*this.cursor = new this.Cursor(css);

            var token = new this.Token();
            var pendingCombinator = void 0;
            var ast = [];

            while (!this.cursor.isEnd()) {

                /!*!// si c'est un espace
                if (this.cursor.now() === tokenType.SPACE) {
                    // on trim jusqu'a un non espace
                    this.collect(function (char) {
                        return char === tokenType.SPACE;
                    });
                    // si ce n'est pas un combinator et que l'on attend pas de selecteur combiné
                    // (e.g 'a > b' juste après '>' fail sinon car il prend ' ' pour un combinator)
                    // alors l'espace était un combinator et non un sugar syntax
                    if (!this.isCombinator() && !pendingCombinator) {
                        this.cursor.move(-1);
                    }
                }*!/

                // '.' '#' '' suivis de \w
                if(this.isQualifier()){
                    // retrieve the qualifier (e.g. '.' '#')
                    token.simple = this.getQualifier();
                    this.cursor.move();
                }

                // caractère alphabétique
                if (this.isWord()) {
                    // collect til end of word
                    token.word = this.collect(this.isAlpha);
                }

                // opening '['
                if (this.isAttribute()) {
                    // bypass '['
                    this.cursor.move();
                    // collect til end of word
                    token.attribute.name = this.collect(function (char) {
                        return /[^=]/.test(char);
                    });
                    // have value
                    if (this.cursor.now() === '=') {
                        // bypass '='
                        this.cursor.move();
                        // collect value
                        token.attribute.value = this.collect(function (char) {
                            return /[^\]]/.test(char);
                        })
                    }
                    // bypass ']'
                    this.cursor.move();
                }

                if (this.isPseudo()) {
                    // bypass ':'
                    this.cursor.move();
                    // collect the pseudo-selector
                    token.pseudo = this.collect(function (char) {
                        return /[\w\d-]/.test(char);
                    });
                }

                // combinator found after this token
                if (this.isCombinator()) {
                    /!*!// si c'est un espace
                    if (this.cursor.now() === tokenType.SPACE) {
                        // on trim jusqu'a un non espace
                        this.collect(function (char) {
                            return char === tokenType.SPACE;
                        });
                        // si ce n'est pas un combinator et que l'on attend pas de selecteur combiné
                        // (e.g 'a > b' juste après '>' fail sinon car il prend ' ' pour un combinator)
                        // alors l'espace était un combinator et non un sugar syntax
                        if (!this.isCombinator() && !pendingCombinator) {
                            this.cursor.move(-1);
                        }
                    }*!/

                    token.combinator.type = this.cursor.now();

                    // si un token attendait son selecteur combiné e.g. 'a > b' a waiting for b
                    if (pendingCombinator) {
                        // on l'ajoute à son selecteur combiné parent
                        // nous sommes ici en tant que b dans le cas de a qui attendait b
                        // meme si b va lui même encore attendre un selecteur combiné c
                        pendingCombinator.combinator.to = token;
                    } else {
                        // on ajoute l'entrée à l'ast car après un combinateur, seul un token peut arriver
                        // nous sommes ici dans le cas de a qui va attendre b
                        ast.push(token);
                    }

                    // waiting for combined token
                    pendingCombinator = token;

                    // nouveau token
                    token = new Parser.prototype.Token();

                    // bypass combinator
                    this.cursor.move();

                } else if(pendingCombinator) { // on attendait un selecteur combiné

                    // on l'ajoute à son selecteur combiné parent
                    pendingCombinator.combinator.to = token;
                    // on met à jour la référence
                    pendingCombinator = void 0;
                    // nouveau token
                    token = new Parser.prototype.Token();

                } else if(this.isDelimiter()) { // ','
                        // on ajoute un entrée à l'ast
                        ast.push(token);
                        // nouveau token
                        token = new Parser.prototype.Token();
                        // bypass ','
                        this.cursor.move();
                    }


            }
            // push last ast, maybe empty
            ast.push(token);

            return ast;*/
        };

        /**
         * collects char while truthlyCb returns true
         * @param truthlyCb
         * @returns {string}
         */
        Parser.prototype.collect = function (truthlyCb) {
            var collected = '';
            while (truthlyCb.call(this, this.cursor.now())) {
                collected += this.cursor.now();
                this.cursor.move();
            }
            return collected;
        };

        /**
         * @param {string} char
         * @returns {boolean}
         */
        Parser.prototype.isWord = function (char) {
            char = char || this.cursor.now();
            return wordReg.test(char);
        };

        /**
         * @param char
         * @returns {boolean}
         */
        Parser.prototype.isAlpha = function (char) {
            char = char || this.cursor.now();
            return alphaReg.test(char);
        };

        /**
         * @returns {boolean}
         */
        Parser.prototype.isQualifier = function () {
            switch (this.cursor.now()) {
                case tokenType.TYPE:
                case tokenType.CLS:
                case tokenType.ID:
                    return this.isWord(this.cursor.next());
                default:
                    return false;
            }
        }

        /**
         * @returns {string}
         */
        Parser.prototype.getQualifier = function () {
            switch (this.cursor.now()) {
                default:
                case tokenType.TYPE:
                    return tokenType.TYPE;
                case tokenType.CLS:
                    return tokenType.CLS;
                case tokenType.ID:
                    return tokenType.ID;
            }
        };

        /**
         * [attr] | [attr=value]
         * @returns {boolean}
         */
        Parser.prototype.isAttribute = function () {
            return this.cursor.now() === tokenType.ATTR && wordReg.test(this.cursor.next());
        };

        // :first-child
        Parser.prototype.isPseudo = function () {
            return this.cursor.now() === tokenType.PSEUDO && wordReg.test(this.cursor.next());
        };

        // 'combinator' ' combinator'
        Parser.prototype.isCombinator = function () {
            return (
                this.cursor.now() === tokenType.CARET
                || this.cursor.now() === tokenType.PLUS
                || this.cursor.now() === tokenType.TILDE
                || this.cursor.now() === tokenType.SPACE
            ) || (
                this.cursor.now() === tokenType.SPACE
                && (
                    this.cursor.next() === tokenType.CARET
                    || this.cursor.next() === tokenType.PLUS
                    || this.cursor.next() === tokenType.TILDE
                    || this.cursor.next() === tokenType.SPACE
                )
            );
        };

        /**
         * @returns {boolean}
         */
        Parser.prototype.isDelimiter = function () {
            return this.cursor.now() === tokenType.COMMAS && this.cursor.next() !== END;
        };

        return Parser;
    })();

    return Sizzle;
})();
Sizzle.parser = new Sizzle.prototype.Parser();

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

        type = type || '';
        this.qualifier.type = type;
        // on peut chainer les classes pour préciser
        this.qualifier.value = qualifier.split('.');
    };

    Token.prototype.haveTag = function () {
        return !!this.tag;
    };

    Token.prototype.haveQualifier = function () {
        return !!this.qualifier.type;
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
    var regSelector = /\s*(\w+)?(?:([.#])(\w[\w\d-_.]*))?(?:\[(\w[\w\d-_]*)(?:=([^\]]+))?\])?(?:::?(\w[\w\d-]*))?\s*/;
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

function restrict(node, vnesting, hnesting){
    vnesting = vnesting || -1;
    hnesting = hnesting || -1;

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
        console.log(nodes, i);
        nodes.concat(nodes[i].childNodes);
    }
    nodes = roots && nodes.slice(roots) || nodes;

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
                return nodes[desc[1]] || [];
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
function findToken(token, nodes) {
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
        var vnesting = void 0, hnesting = void 0;
        switch (token.combinator.type){
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
                return nodes;
        }
        nodes = nodes.reduce(function (acc, node) {
            return acc.concat(restrict(node, vnesting, hnesting));
        }, []).deduplicate();
        nodes = findToken(token.combinator.to, nodes);
    }

    return nodes;
}

/**
 *
 * @param {Token[]} ast
 * @param {HTMLElement} context
 */
function findAst(ast, context) {
    context = context || document;
    return toPlainArray(ast.map(function (token) {
        return findToken(token, [context]);
    })).deduplicate();
}

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
 */
function h(nodeName, attrs) {
    var childs = toPlainArray(Array.prototype.slice.call(arguments, 2));
    var node = buildHyperNode(document.createElement(nodeName || 'div'));
    Object.keys(attrs || {}).forEach(function (attribute) {
        node.setAttribute(attribute, attrs[attribute]);
    });
    childs.forEach(function (child) {
        node.appendChild(child);
    });

    return node;
}

function $(selector, context){
    context = context || document;
    return findAst(cssAst(selector), context);
}