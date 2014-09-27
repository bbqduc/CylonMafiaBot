'use strict';

exports.up = function(knex, Promise) {
	return Promise.all([
			knex.schema.createTable("Players", function(table) {
				table.increments("id").primary();
				table.string("name").unique();
			}),

			knex.schema.createTable("Games", function(table) {
				table.increments("id").primary();
				table.dateTime("start_time");
				table.dateTime("end_time");
			}),

			knex.schema.createTable("Messages", function(table) {
				table.integer("game_id");
				table.integer("player_id");
                table.integer("nth_in_game");
				table.dateTime("time"); // TODO : uniqueness problems ?
				table.text("text");
				table.json("properties");

                table.primary(["game_id", "nth_in_game"]);

			}),

			knex.schema.createTable("Commands", function(table) {
				table.integer("game_id");
				table.integer("player_id");
                table.integer("nth_in_game");
				table.dateTime("time");// TODO : uniqueness problems ?
				table.json("properties");

				table.primary(["game_id", "nth_in_game"]);
			}),

			knex.schema.createTable("Roles", function(table) {
				table.increments("id");
				table.string("name").unique();
			}),

			knex.schema.createTable("PlayedGames", function(table) {
				table.integer("player_id");
				table.integer("game_id");
				table.integer("role_id");

				table.primary(["player_id", "game_id", "role_id"]);
			})]);
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.dropTable("Players"),
		knex.schema.dropTable("Games"),
		knex.schema.dropTable("Messages"),
		knex.schema.dropTable("Commands"),
		knex.schema.dropTable("Roles"),
		knex.schema.dropTable("PlayedGames")
		]);
};
