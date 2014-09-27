'use strict';

exports.up = function(knex, Promise) {
    return knex.schema.table('PlayedGames', function(table) {

        // Voting stats
        table.integer("votes_called");
        table.integer("passed_votes_called");
        table.integer("voted_yes");
        table.integer("voted_no");

        // Kill stats
        table.integer("killed_players");

        // General
        table.boolean("won_game");
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('PlayedGames', function(table) {
        table.dropColumn("votes_called");
        table.dropColumn("passed_votes_called");
        table.dropColumn("voted_yes");
        table.dropColumn("voted_no");
        table.dropColumn("killed_players");
        table.dropColumn("won_game");
    });
};
