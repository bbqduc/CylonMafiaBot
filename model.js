var knex = require('knex');
var config = require('./knexfile').staging;
var DB = knex.initialize(config);
var _ = require("lodash");
_.str = require("underscore.string");
_.str.include("Underscore.string", "string");

var bookshelf = require('bookshelf')(DB);


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

    Player: bookshelf.Model.extend({
        tableName: "Players",
        games: function () {
            return this.belongsToMany(Game).through(PlayedGame);
        },
        roles: function () {
            return this.belongsToMany(Role).through(PlayedGame);
        },
        format: formatFunc,
        parse: parseFunc
    }),

    Game: bookshelf.Model.extend({
        tableName: "Games",
        players: function () {
            return this.belongsToMany(Player).through(PlayedGame);
        },
        roles: function () {
            return this.belongsToMany(Role).through(PlayedGame);
        },
        messages: function () {
            return this.hasMany(Message);
        },
        commands: function () {
            return this.hasMany(Command);
        },
        format: formatFunc,
        parse: parseFunc
    }),

    Message:  bookshelf.Model.extend({
        tableName: "Messages",
        game: function () {
            return this.belongsTo(Game);
        },
        player: function () {
            return this.belongsTo(Player);
        },
        format: formatFunc,
        parse: parseFunc
    }),

    Command:  bookshelf.Model.extend({
        tableName: "Commands",
        game: function () {
            return this.belongsTo(Game);
        },
        player: function () {
            return this.belongsTo(Player);
        },
        format: formatFunc,
        parse: parseFunc
    }),

    Role : bookshelf.Model.extend({
        tableName: "Roles",
        games: function () {
            return this.belongsToMany(Game).through(PlayedGame);
        },
        players: function () {
            return this.belongsToMany(Player).through(PlayedGame);
        },
        format: formatFunc,
        parse: parseFunc
    }),

    PlayedGame : bookshelf.Model.extend({
        tableName: "PlayedGames",
        format: formatFunc,
        parse: parseFunc
    }),

    DB: DB
};

