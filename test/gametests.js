/**
 * Created by johannes on 21/09/14.
 */


var assert = require("should");
var _ = require("lodash");

var Game = require("../game");

var DummyCommunicationInterface = function()
{
    this.sendPublicMessage = function(message) {
    };

    this.sendPrivateMessage = function(targetNick, message) {
    };
};


describe("Game", function() {

    describe("Joining and leaving", function() {
        var game = new Game();
        game.communicationInterface = new DummyCommunicationInterface();
        it("should be possible to join a game", function() {
            game.onPublicMessage("TestUser1", "!join");
            game.onPublicMessage("TestUser1", "!join");
            _.size(game.players).should.be.exactly(1);
        });
        it("should be possible to leave a game", function() {
            game.onPublicMessage("TestUser1", "!leave");
            game.onPublicMessage("TestUser1", "!leave");
            _.size(game.players).should.be.exactly(0);
        });
        it("should not be possible to join an ongoing game", function() {
            game.onPublicMessage("TestUser1", "!join");
            game.startGame();
            game.onPublicMessage("TestUser2", "!join");
            _.size(game.players).should.be.exactly(1);
        });
        it("should not be possible to leave an ongoing game", function() {
            game.onPublicMessage("TestUser1", "!leave");
            _.size(game.players).should.be.exactly(1);
        });
    });
    describe("Determining roles", function() {
        var game = new Game();
        game.communicationInterface = new DummyCommunicationInterface();
        var numPlayers = 5;
        var names = [];
        var i;
        for(i=0;i<numPlayers;++i) {
            names.push("TestUser" + i);
            game.onPublicMessage(names[i], "!join");
        }
        game.startGame();

        it("All players should receive a role", function() {
            for(i=0;i<numPlayers;++i) {
                (game.players[names[i]].role == null).should.be.false;
            }
        });
        it("All players should receive a unique role", function() {
            var roleNames = _.map(game.players, function(player, name) {
                return player.role.NAME;
            });
            var uniqNames = _.uniq(roleNames);
            uniqNames.length.should.be.exactly(roleNames.length);
        });
    });
});
