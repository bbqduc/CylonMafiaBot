var knex = require('knex');
var configs = require('./knexfile');
var config = configs[process.NODE_ENV];
if(config == null) config = configs.development;
var DB = knex.initialize(config);
var _ = require("lodash");


var parseFunc = function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
        memo[_.str.camelize(key)] = val;
        return memo;
    }, {});
};

var formatFunc = function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
        memo[_.str.underscored(key)] = val;
        return memo;
    }, {});
};

module.exports = {
    DB: DB
};

