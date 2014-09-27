'use strict';

exports.up = function(knex, Promise) {
    return knex.schema.table('Games', function(table) {
        table.bool("finished");

    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('Games', function(table) {
        table.dropColumn("finished");
    });
};
