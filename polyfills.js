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
)