var fs = require('fs');
var _ = require('lodash');
var files = fs.readdirSync(__dirname);
_.forEach(files, function(element, index) {
    if(element.match(/.+\.js/g) !== null && element !== 'index.js') {
        var name = element.replace('.js', '');
        exports[name] = require('./' + element);
    }
});
