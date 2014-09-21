/**
 * Created by johannes on 21/09/14.
 */
var fs = require('fs');
var _ = require('lodash');
exports.role = require('./role');
var abilities = require('../abilities');
var winresolvers = require('../winresolvers');

var files = fs.readdirSync(__dirname);
_.forEach(files, function(element, index) {
    if(element.match(/.+\.js$/g) !== null && element !== 'index.js' && element !== 'role.js') {
        var name = element.replace('.js', '');
        exports[name] = require('./' + element);
    } else if(element.match(/.+\.json$/) !== null) {
        var jsonObj = JSON.parse(fs.readFileSync(__dirname + "/" + element, "utf8"));
        var name = element.replace('.json', '');
        exports[name] = function() {
            this.abilities = [];
            _.forEach(jsonObj.abilities, function(ability, index) {
                this.abilities.push(new abilities[ability]());
            }, this);
            exports.role.call(this);
        };
        exports[name].prototype = Object.create(exports.role.prototype);
        exports[name].prototype.constructor = exports[name];
        exports[name].prototype.NAME = jsonObj.name;
        exports[name].prototype.FACTION = jsonObj.faction;
        var resolverName = typeof(jsonObj.winresolver) === "string" ? jsonObj.winresolver : jsonObj.winresolver.name;
        var resolverParams = typeof(jsonObj.winresolver) === "string" ? [] : jsonObj.winresolver.parameters;
        winresolvers[resolverName].apply(exports[name].prototype.winResolver, resolverParams);
    }
});
