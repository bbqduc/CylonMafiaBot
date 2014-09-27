'use strict';

exports.up = function(knex, Promise) {
    return Promise.all([knex.schema.table('Messages', function(table) {
        table.integer("turn")
    }),
        knex.schema.table("Commands", function(table) {
            table.integer("turn");
        })]);
};

exports.down = function(knex, Promise) {
    return Promise.all([knex.schema.table('Messages', function(table) {
        table.dropColumn("turn")
    }),
        knex.schema.table("Commands", function(table) {
            table.dropColumn("turn");
        })]);
};

