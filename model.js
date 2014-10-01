var knex = require('knex');
var configs = require('./knexfile');
var config = configs[process.env.NODE_ENV];
if(config == null) config = configs.development;
var DB = knex.initialize(config);

module.exports = {
    DB: DB
};

