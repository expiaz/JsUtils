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