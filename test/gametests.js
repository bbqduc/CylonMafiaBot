/**
 * Created by johannes on 21/09/14.
 */


var assert = require("should");
var _ = require("lodash");
var utils = require("../utils");

var Game = require("../game");

describe("Game", function() {

    describe("Joining and leaving", function() {
        var game = new Game();
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
    describe("Voting", function() {
        var game;
        beforeEach(function() {
            game = new Game();
            utils.addManyPlayers(game, 5, "TestUser");
            game.startGame();
        });
        it("Calling a vote should not be possible when the game hasn't started", function() {
            game = new Game();
            utils.addManyPlayers(game, 5, "TestUser");
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.throw();
        });
        it("Calling a vote should not be possible at night", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            game.isNight = true; // TODO : this is a pretty ham-fisted way to make it night
            (function() { player.callAirlockVote("TestUser2")}).should.throw();
        });
        it("Voting should not be possible until a vote has been called", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.vote("yes")}).should.throw();
        });
        it("Calling a vote should be possible when no vote is active", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            game.airlockVoteTarget.nick.should.be.exactly("TestUser2");
        });
        it("Voting should be possible once vote has been called", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            (function() { player.vote("yes")}).should.not.throw();
        });
        it("it should not be possible to vote more than once", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            (function() { player.vote("yes")}).should.not.throw();
            game.yesVotes.should.be.exactly(1);
            (function() { player.vote("yes")}).should.throw();
            game.yesVotes.should.be.exactly(1);
        });
        it("it should not be possible to change your vote", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            (function() { player.vote("yes")}).should.not.throw();
            game.yesVotes.should.be.exactly(1);
            (function() { player.vote("no")}).should.throw();
            game.yesVotes.should.be.exactly(1);
        });
        it("voting should finish when all players have voted", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("no")}).should.not.throw();
            });
            (game.airlockVoteTarget == null).should.be.true;
            game.voteInProgress.should.be.false;
            game.yesVotes.should.be.exactly(0);
            game.noVotes.should.be.exactly(0);
            game.votedPlayers.length.should.be.exactly(0);
        });
        it("a majority yes-vote should result in the target dying", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            var numPlayers = game.getAlivePlayers().length;
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("yes")}).should.not.throw();
            });
            game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
            (function() { game.getAlivePlayerByNickOrThrow("TestUser2")}).should.throw();
        });
        it("a majority no-vote should result in the target surviving", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            var numPlayers = game.getAlivePlayers().length;
            (function() { player.callAirlockVote("TestUser2")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("no")}).should.not.throw();
            });
            game.getAlivePlayers().length.should.be.exactly(numPlayers);
            (function() { game.getAlivePlayerByNickOrThrow("TestUser2")}).should.not.throw();
        });
        it("a vote to skip the airlocking should result in no deaths", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            var numPlayers = game.getAlivePlayers().length;
            (function() { player.callAirlockVote("")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("yes")}).should.not.throw();
            });
            game.voteInProgress.should.be.false;
            game.getAlivePlayers().length.should.be.exactly(numPlayers);
        });
        it("a passing vote should trigger nighttime", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            var numPlayers = game.getAlivePlayers().length;
            (function() { player.callAirlockVote("")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("yes")}).should.not.throw();
            });
            game.isNight.should.be.true;
        });
        it("a failing vote should not trigger nighttime", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            var numPlayers = game.getAlivePlayers().length;
            (function() { player.callAirlockVote("")}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                (function() { player.vote("no")}).should.not.throw();
            });
            game.isNight.should.be.false;
        });
    });
    describe("Using abilities", function() {
        beforeEach(function() {
            game = new Game();
            utils.addManyPlayers(game, 5, "TestUser");
            game.startGame();
        });
        describe("Kill ability", function() {
            var number2;
            beforeEach(function() {
                number2 = _.find(game.getAlivePlayers(), function(player) {
                    return player.role.NAME === "Cylon Number 2";
                });
            });
            it("should not be possible to use during the day", function () {
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.throw();
            });
            it("should be possible to use during the night", function () {
                game.isNight = true;
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.not.throw();
            });
            it("should result in the target's death with no outside intervention", function () {
                game.isNight = true;
                var numPlayers = game.getAlivePlayers().length;
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.not.throw();
                game.resolveAbilities();
                game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
                (function() {game.getAlivePlayerByNickOrThrow("TestUser1"); }).should.throw();
            });
            it("should not be possible to use it more than once per night", function () {
                game.isNight = true;
                var numPlayers = game.getAlivePlayers().length;
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.not.throw();
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.throw();
            });
            it("should be possible to use it again on the next night", function () {
                game.isNight = true;
                var numPlayers = game.getAlivePlayers().length;
                (function() {number2.receiveCommand("kill", "TestUser1") }).should.not.throw();
                game.resolveAbilities();
                game.isNight = true;
                (function() {number2.receiveCommand("kill", "TestUser2") }).should.not.throw();
            });
        });
    });
});
