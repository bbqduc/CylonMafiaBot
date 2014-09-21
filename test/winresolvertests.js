/**
 * Created by johannes on 21/09/14.
 */

var assert = require("should");
var fs = require("fs");
var _ = require("lodash");
var winresolvers = require("../winresolvers");
var Game= require("../game");

var addPlayersHelper = function(game, numPlayers) {
    for(var i = 0; i < numPlayers; ++i) {
       game.addPlayer("TestUser" + i, "")
    }
};

describe('Win resolvers', function() {
    describe("Faction win resolver", function() {
        it('should result in Human win when only humans are alive', function() {
            var game = new Game();
            addPlayersHelper(game, 5);
            game.startGame();

            var numOriginalHumanPlayers =  game.getPlayersFromFaction("Human").length;
            _.forEach(game.getPlayersFromFaction("Cylon"), function(player, nick) {
                player.dead = true;
            });
            for(var humansKilled = 0; humansKilled < numOriginalHumanPlayers; ++humansKilled) {
                if(humansKilled !== 0) {
                    game.getAlivePlayersFromFaction("Human")[0].dead = true;
                }
                _.forEach(game.getPlayersFromFaction("Human"), function(player, nick) {
                    player.role.resolveWin(game).should.be.true;
                });
            }
        });
        it('should result in Cylon win when only cylons are alive', function() {
            var game = new Game();
            addPlayersHelper(game, 5);
            game.startGame();

            var numOriginalCylonPlayers =  game.getPlayersFromFaction("Cylon").length;
            _.forEach(game.getPlayersFromFaction("Human"), function(player, nick) {
                player.dead = true;
            });
            for(var cylonsKilled = 0; cylonsKilled < numOriginalCylonPlayers; ++cylonsKilled) {
                if(cylonsKilled !== 0) {
                    game.getAlivePlayersFromFaction("Cylon")[0].dead = true;
                }
                _.forEach(game.getPlayersFromFaction("Cylon"), function(player, nick) {
                    player.role.resolveWin(game).should.be.true;
                });
            }
        });
        it('should not result in Cylon win when humans are still alive', function() {
            var game = new Game();
            addPlayersHelper(game, 5);
            game.startGame();

            var numOriginalHumanPlayers =  game.getPlayersFromFaction("Human").length;
            for(var humansKilled = 0; humansKilled < numOriginalHumanPlayers-1; ++humansKilled) {
                if(humansKilled !== 0) {
                    game.getAlivePlayersFromFaction("Human")[0].dead = true;
                }
                _.forEach(game.getPlayersFromFaction("Cylon"), function(player, nick) {
                    player.role.resolveWin(game).should.be.false;
                });
            }
        });
        it('should not result in Human win when Cylons are still alive', function() {
            var game = new Game();
            addPlayersHelper(game, 5);
            game.startGame();

            var numOriginalCylonPlayers =  game.getPlayersFromFaction("Cylon").length;
            _.forEach(game.getPlayersFromFaction("Human"), function(player, nick) {
                player.dead = true;
            });
            for(var cylonsKilled = 0; cylonsKilled < numOriginalCylonPlayers-1; ++cylonsKilled) {
                if(cylonsKilled !== 0) {
                    game.getAlivePlayersFromFaction("Cylon")[0].dead = true;
                }
                _.forEach(game.getPlayersFromFaction("Human"), function(player, nick) {
                    player.role.resolveWin(game).should.be.false;
                });
            }
        });
    });
});
