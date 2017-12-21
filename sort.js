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

String.prototype.toArray = (
    String.prototype.toArray
    || function (){
        var ret = [];
        for(var i = 0; i < this.length; i++) ret.push(this[i]);
        return ret;
    }
);


/**
 * the attributes possibles for searching, containing the appliables operators and a strategy to extract the attribute from a node (null if not possible)
 * @type {Object}
 */
var options = {

    debounce: 1000,
    handler: '.vrzhzr',
    rows: '.fezgzry',

    operations: {
        '>': function (actual, expected) {
            return actual > expected;
        },
        '>=': function (actual, expected) {
            return actual >= expected;
        },
        '<': function (actual, expected) {
            return actual < expected;
        },
        '<=': function (actual, expected) {
            return actual <= expected;
        },
        '=': function (actual, expected) {
            return actual === expected;
        },
        '!=': function (actual, expected) {
            return actual !== expected;
        },
        '^=': function (actual, expected) {
            return !actual.indexOf(expected);
        },
        '$=': function (actual, expected) {
            return actual.indexOf(expected, actual.length - expected.length) !== -1;
        },
        '*=': function (actual, expected) {
            return actual.indexOf(expected) !== -1;
        }
    },

    transform: [
        String.prototype.toLowerCase,
        String.prototype.trim,
    ],

    attributes: {
        numero: {
            op: ['>', '>=', '<', '<=', '=', '!='],
            extract: function (node) {
                return node.hasAttribute('data-numero')
                    ? node.getAttribute('data-numero')
                    : null;
            },
            transform: {
                expected: [
                    String.prototype.trim,
                    function(){
                        return parseInt(this, 10)
                    }
                ],
                actual: [
                    String.prototype.trim,
                    function(){
                        return parseInt(this, 10)
                    }
                ]
            }
        },
        type: {
            op: ['=', '!=', '^=', '$=', '*='],
            extract: function (node) {
                return node.hasAttribute('data-type')
                    ? node.getAttribute('data-type')
                    : null;
            },
            transform: {
                expected: [
                    String.prototype.toLowerCase,
                    String.prototype.trim,
                ],
                actual: [
                    String.prototype.toLowerCase,
                ]
            }
        },
        name: {
            op: ['=', '!=', '^=', '$=', '*='],
            extract: function (node) {
                return node.hasAttribute('data-name')
                    ? node.getAttribute('data-name')
                    : null;
            },
            transform: {
                expected: [
                    String.prototype.toLowerCase,
                    String.prototype.trim,
                ],
                actual: [
                    String.prototype.toLowerCase,
                    String.prototype.trim,
                ]
            }
        },
        description: {
            op: ['=', '!=', '^=', '$=', '*='],
            extract: function (node) {
                var found = node.lastElementChild;
                return found !== null && found.nodeType === 1 && found.nodeName === 'TD'
                    // get the 'p' under the 'td'
                    ? found.firstElementChild.innerText
                    : null;
            },
            transform: {
                expected: [
                    String.prototype.trim,
                ],
                actual: [
                    String.prototype.trim,
                ]
            }
        }
    },

    error: {
        malformed: function (search, expression) {
            throw new Error("Malformed expression : " + expression);
        },
        badAttribute: function (attribute) {
            throw new Error("Attribute " + attribute + " does not exists (exists : " + Object.keys(options.attributes).join(', ') + ")");
        },
        badOperator: function (attribute, operator) {
            throw new Error("Operator " + operator + " is not accepted for " + attribute + " (exists : " + options.attributes[attribute].op.join(', ') + ")");
        },
        badTransform: function (attribute, type) {
            throw new Error("Attribute " + attribute + " should hold value");
        }
    }
}

/**
 * create a sort for the provided options
 * @param options
 * @return {sort}
 */
var setupSort = function (options) {

    /**
     * possible operators
     */
    var ops = Object.keys(options.attributes).reduce(function (ops, attr) {
        return ops.concat(options.attributes[attr].op);
    }, []).deduplicate();

    /**
     * reserved keyword
     * @type {string}
     */
    var reserved = '&|' + ops.join('').toArray().deduplicate().join('');

    /**
     * escape operations for regexp
     * @type {Array}
     */
    var escaped = ops.map(function (op) { return op.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");  });

    /**
     * expression regexp
     * @type {RegExp}
     */
    var exprReg = new RegExp('([^' + reserved + ']+)\\s*(' + escaped.join('|') + ')\\s*([^' + reserved + ']+)');

    /**
     * filter rows with search criterias
     * @param search string
     * @param rows {HTMLElement[]}
     * @return {HTMLElement[]}
     * @throws Error
     */
    function sort(rows, search) {

        if(!search) return rows;

        /**
         * Ast for and / or expressions and binary operators
         * @type {Array}
         */
        var andTokens = search.split(/\|\|/).map(function (expressions) {
            return expressions.split(/&&/).map(function (expression) {
                var token = expression.match(exprReg);
                if(token === null) {
                    options.error.malformed.call(null, search, expression);
                }
                return token;
            });
        });

        return rows.filter(function (node) {
            // assume that expression is false, it'll be verified with 'or' algebra (false || true => true)
            return andTokens.reduce(function (isValid, andToken) {
                // assume that the expression is true, it'll be verified with 'and' algrebra (true && false => false)
                return isValid || andToken.reduce(function (valid, orToken) {

                    var expected = orToken[3],
                        op = orToken[2],
                        attr = options.transform.reduce(function (attr, func) { return func.call(attr); }, orToken[1]);

                    if(attr === null) {
                        return options.error.badTransform.call(null, attr, 'attribute');
                    }

                    if(! options.attributes.hasOwnProperty(attr)) {
                        return options.error.badAttribute.call(null, attr);
                    }
                    if( options.attributes[attr].op.indexOf(op) === -1) {
                        return options.error.badOperator.call(null, attr, op);
                    }

                    var actual = options.attributes[attr].extract.call(null, node);

                    if(actual === null) {
                        return false;
                    }

                    actual = options.attributes[attr].transform.actual.reduce(function (str, func) {
                        return func.call(str);
                    }, actual);

                    if(actual === null) {
                        return options.error.badTransform.call(null, attr, 'actual');
                    }

                    expected = options.attributes[attr].transform.expected.reduce(function (str, func) {
                        return func.call(str);
                    }, expected);

                    if(expected === null) {
                        return options.error.badTransform.call(null, attr, 'expected');
                    }

                    return valid && options.operations[op].call(null, actual, expected);

                }, true);
            }, false);
        });
    }

    return sort;
};

/**
 * filter rows with search criterias
 * @param search string
 * @param rows {HTMLElement[]}
 * @return {HTMLElement[]}
 * @throws Error
 */
var sort = setupSort(options);