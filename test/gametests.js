/**
 * Created by johannes on 21/09/14.
 */


var assert = require("should");
var _ = require("lodash");
var utils = require("../utils");

var Game = require("../game");
var roleClasses = require("../roles");
var abilityClasses = require("../abilities");

var allPlayersPass = function(game) {
	_.forEach(game.getAlivePlayers(), function(player, key) {
        game.onCommand(player.nick, {id: "pass"});
		//player.onCommand("pass", "");
	});
};

var passVoting = function(game) {
    game.onCommand(game.getAlivePlayers()[0].nick, {id :"airlock"});
    _.forEach(game.getAlivePlayers(), function (player, key) {
        if(game.isNight){
            return false;
        }
        game.onCommand(player.nick, {id :"vote", votedYes: !(player.role instanceof roleClasses.cylonpolitician)});
    });
};


var initGameWithAllRoles = function(done) {
    var game = new Game();
    _.forOwn(roleClasses, function(role, name) {
        if(name != "role") {
            game.addPlayer(name, "");
        }
    });
    game.startGame().then(function() {
        _.forOwn(roleClasses, function(role, name) {
            if(name != "role") {
                game.getPlayerByNickOrThrow(name).role = new roleClasses[name];
            }
        });
        done(game);
    });
};

describe("Game", function() {
    describe("Bot messages", function() {
        it("should send private messages to each player at the start of the game", function(done) {
			  initGameWithAllRoles(function(game){
                  game.communicationInterface.sentPrivateMessages.length.should.be.exactly(game.getAlivePlayers().length);
                  done();
              });
		  });
	 });

    describe("Joining and leaving", function() {
        var game;
        beforeEach(function()
        {
            game = new Game();
        });
        it("should be possible to join a game", function(done) {
            game.onCommand("TestUser1", {id: "join"});
            game.onCommand("TestUser1", {id: "join"});
            game.startGame()
                .then()
                .catch()
               .finally(function() {
                    _.size(game.players).should.be.exactly(1);
                    done();
                });
        });
        it("should be possible to leave a game", function(done) {
            game.onCommand("TestUser1", {id: "join"});
            game.onCommand("TestUser1", {id: "leave"});
            game.onCommand("TestUser1", {id: "leave"});
            game.startGame()
                .then()
                .catch()
                .finally(function() {
                    _.size(game.players).should.be.exactly(0);
                    done();
                });
        });
        it("should not be possible to join an ongoing game", function(done) {
            game.onCommand("TestUser1", {id: "join"});
            game.onCommand("TestUser2", {id: "join"});
            game.onCommand("TestUser3", {id: "join"});
            game.onCommand("TestUser4", {id: "join"});
            game.startGame().finally(function() {
                game.onCommand("TestUser5", {id: "join"});
                _.size(game.players).should.be.exactly(4);
                done();
            });
        });
        it("should not be possible to leave an ongoing game", function() {
            game.onCommand("TestUser1", {id: "join"});
            game.onCommand("TestUser2", {id: "join"});
            game.onCommand("TestUser3", {id: "join"});
            game.onCommand("TestUser4", {id: "join"});
            game.startGame().finally(function() {
                game.onCommand("TestUser4", {id: "leave"});
                _.size(game.players).should.be.exactly(4);
            });
        });
    });
    describe("Determining roles", function() {
        var game;
        var numPlayers = 5;
        var names = [];
        beforeEach(function(done) {
            game = new Game();
            var i;
            for (i = 0; i < numPlayers; ++i) {
                names.push("TestUser" + i);
                game.onCommand(names[i], {id: "join"});
            }
            game.startGame().then(done);
        });
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
        beforeEach(function(done) {
            game = new Game();
            utils.addManyPlayers(game, 6, "TestUser");
            game.startGame().then(function() {
                allPlayersPass(game);
                done();
            });
        });
        it("Calling a vote should not be possible when the game hasn't started", function() {
            game = new Game();
            utils.addManyPlayers(game, 6, "TestUser");
                (function() { game.onCommand("TestUser2", {id :"airlock", target: "TestUser1"})}).should.throw();
        });
        it("Calling a vote should not be possible at night", function(done) {
            game = new Game();
            utils.addManyPlayers(game, 6, "TestUser");
            game.startGame().then(function() {
                (function() { game.onCommand("TestUser2", {id :"airlock", target: "TestUser1"})}).should.throw();
                done();
            });
        });
        it("Voting should not be possible until a vote has been called", function() {
            (function() { game.onCommand("TestUser1", {id :"vote", votedYes: true});}).should.throw();
        });
        it("Calling a vote should be possible when no vote is active", function() {
            (function() { game.onCommand("TestUser1", {id :"airlock", target: "TestUser2"});}).should.not.throw();
            game.airlockVoteTarget.nick.should.be.exactly("TestUser2");
        });
        it("Voting should be possible once vote has been called", function() {

            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            (function() { game.onCommand("TestUser2", {id: "vote", votedYes: true})}).should.not.throw();
        });
        it("it should not be possible to vote more than once", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            (function() { game.onCommand("TestUser1", {id: "vote", votedYes: true})}).should.not.throw();
            (game.yesVotes + game.noVotes).should.be.exactly(player.role.votingPower);
            (function() { game.onCommand("TestUser1", {id: "vote", votedYes: true})}).should.throw();
            (game.yesVotes + game.noVotes).should.be.exactly(player.role.votingPower);
        });
        it("it should not be possible to change your vote", function() {
            var player = game.getPlayerByNickOrThrow("TestUser1");
            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            (function() { game.onCommand("TestUser1", {id: "vote", votedYes: true})}).should.not.throw();
            (game.yesVotes + game.noVotes).should.be.exactly(player.role.votingPower);
            (function() { game.onCommand("TestUser1", {id: "vote", votedYes: false})}).should.throw();
            (game.yesVotes + game.noVotes).should.be.exactly(player.role.votingPower);
        });
        it("voting should finish when a majority has been reached", function() {
            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            var totalVotingPower = game.getTotalVotingPower();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                var noVotes = game.noVotes;
                (function() { game.onCommand(player.nick, {id: "vote", votedYes: player.role instanceof roleClasses.cylonpolitician})}).should.not.throw();
                if(player.role.votingPower + noVotes >= totalVotingPower / 2) {
                    return false;
                }
            });
            game.yesVotes.should.be.exactly(0);
            game.noVotes.should.be.exactly(0);
            (game.airlockVoteTarget == null).should.be.true;
            game.voteInProgress.should.be.false;
            game.votedPlayers.length.should.be.exactly(0);
        });
        it("a majority yes-vote should result in the target dying", function() {
            var numPlayers = game.getAlivePlayers().length;
            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                if(game.voteInProgress) {
                    (function() { game.onCommand(player.nick, {id: "vote", votedYes: true})}).should.not.throw();
                } else {
                    return false;
                }
            });
            game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
            (function() { game.getAlivePlayerByNickOrThrow("TestUser2")}).should.throw();
        });
        it("a majority no-vote should result in the target surviving", function() {
            var numPlayers = game.getAlivePlayers().length;
            (function() { game.onCommand("TestUser2", {id: "airlock", target: "TestUser2"})}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                if(game.voteInProgress) {
                    (function() { game.onCommand(player.nick, {id: "vote", votedYes: false})}).should.not.throw();
                } else {
                    return false;
                }
            });
            game.getAlivePlayers().length.should.be.exactly(numPlayers);
            (function() { game.getAlivePlayerByNickOrThrow("TestUser2")}).should.not.throw();
        });
        it("a vote to skip the airlocking should result in no deaths", function() {
            var numPlayers = game.getAlivePlayers().length;
            (function() { game.onCommand("TestUser2", {id: "airlock"});}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                if(game.voteInProgress) {
                    (function() { game.onCommand(player.nick, {id: "vote", votedYes: true})}).should.not.throw();
                } else {
                    return false;
                }
            });
            game.voteInProgress.should.be.false;
            game.getAlivePlayers().length.should.be.exactly(numPlayers);
        });
        it("a passing vote should trigger nighttime", function() {
            var numPlayers = game.getAlivePlayers().length;
            (function() { game.onCommand("TestUser2", {id: "airlock"});}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                if(game.voteInProgress) {
                    (function() { game.onCommand(player.nick, {id: "vote", votedYes: true})}).should.not.throw();
                } else {
                    return false;
                }
            });
            game.voteInProgress.should.be.false;
            game.isNight.should.be.true;
        });
        it("a failing vote should not trigger nighttime", function() {
            var numPlayers = game.getAlivePlayers().length;
            (function() { game.onCommand("TestUser2", {id: "airlock"});}).should.not.throw();
            _.forEach(game.getAlivePlayers(), function(player, index) {
                if(game.voteInProgress) {
                    (function() { game.onCommand(player.nick, {id: "vote", votedYes: false})}).should.not.throw();
                } else {
                    return false;
                }
            });
            game.voteInProgress.should.be.false;
            game.isNight.should.be.false;
        });
    });
    describe("Using abilities", function() {
        describe("Generic usage tests", function() {
            _.forOwn(abilityClasses, function(ability, name) {
                if(ability == abilityClasses.ability) return;

                describe(name, function() {
                    var obj = new ability();
                    it("should " + (obj.enabledDay ? "" : "not") + " be possible to use during the day", function () {
                        allPlayersPass(game);
                        game.isNight.should.be.false;
                        var alivePlayers = game.getAlivePlayers();
                        var targets = [];
                        for (var i = 0; i < obj.maxTargets; ++i) {
                            targets.push(alivePlayers[i].nick);
                        }
                        if (obj.enabledDay) {
                            (function () {
                                obj.validateCommand(game, {id: ability.commandWord, targets: targets});
                            }).should.not.throw();
                        } else {
                            (function () {
                                obj.validateCommand(game, {id: ability.commandWord, targets: targets});
                            }).should.throw();
                        }
                    });
                    it("should " + (obj.enabledNight ? "" : "not") + " be possible to use during the night", function () {
                        game.isNight.should.be.true;
                        var alivePlayers = game.getAlivePlayers();
                        var targets = [];
                        for (var i = 0; i < obj.maxTargets; ++i) {
                            targets.push(alivePlayers[i].nick);
                        }
                        if (obj.enabledNight) {
                            (function () {
                                obj.validateCommand(game, {id: ability.commandWord, targets: targets});
                            }).should.not.throw();
                        } else {
                            (function () {
                                obj.validateCommand(game, {id: ability.commandWord, targets: targets});
                            }).should.throw();
                        }
                    });
                    });
                });
        });
        var game;
        beforeEach(function(done) {
            initGameWithAllRoles(function(instance) {
                game = instance;
                done();
            });
        });

        describe("Kill ability", function() {
            it("should not be possible to use too many charges", function () {
                game.isNight.should.be.true;
                (function() {game.onCommand("tomzarek", {id: "kill", targets: ["number2"]});}).should.not.throw();
                game.forceEndNight();
                game.advanceToNight();
                (function() {game.onCommand("tomzarek", {id: "kill", targets: ["tomzarek"]});}).should.throw();
            });
            it("should result in the target's death with no outside intervention", function () {
                var numPlayers = game.getAlivePlayers().length;
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: ["tomzarek"]});}).should.not.throw();
                game.forceEndNight();
                game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
                (function() {game.getAlivePlayerByNickOrThrow("tomzarek"); }).should.throw();
            });
        });
        describe("Block ability", function() {
            var blocker;
            beforeEach(function() {
                blocker = game.getPlayerByNickOrThrow("cylonblocker");
            });
            it("should block a kill command", function () {
                var numPlayers = game.getAlivePlayers().length;
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: ["tomzarek"]});}).should.not.throw();
                (function() {game.onCommand("humanblocker", {id: "block", targets: ["number2"]});}).should.not.throw();
                game.forceEndNight();
                game.getAlivePlayers().length.should.be.exactly(numPlayers);
                (function() {game.getAlivePlayerByNickOrThrow("tomzarek");}).should.not.throw();
            });
            it("should not block a kill command targeted at self", function () {
                var numPlayers = game.getAlivePlayers().length;
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: ["humanblocker"]});}).should.not.throw();
                (function() {game.onCommand("humanblocker", {id: "block", targets: ["number2"]});}).should.not.throw();
                game.forceEndNight();
                game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
                (function() {game.getAlivePlayerByNickOrThrow("humanblocker");}).should.throw();
            });
        });
        describe("Swap ability", function() {
            it("should swap a kill order", function () {
                var numPlayers = game.getAlivePlayers().length;
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: ["tomzarek"]});}).should.not.throw();
                (function() {game.onCommand("coloneltigh", {id: "swap", targets: ["number2", "tomzarek"]});}).should.not.throw();
                game.forceEndNight();
                game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
                (function() {game.getAlivePlayerByNickOrThrow("tomzarek");}).should.not.throw();
                (function() {game.getAlivePlayerByNickOrThrow("number2");}).should.throw();
            });
        });
        describe("Supervoter ability", function() {
            it("should make your votes count as double", function () {
                allPlayersPass(game);
                (function() { game.onCommand("cylonpolitician", {id: "airlock", target: "roslin"}); }).should.not.throw();
                game.yesVotes.should.be.exactly(0);
                game.noVotes.should.be.exactly(0);
                (function() { game.onCommand("roslin", {id: "vote", votedYes: true}); }).should.not.throw();
                game.yesVotes.should.be.exactly(2);
                game.noVotes.should.be.exactly(0);
            });
        });
        describe("Liar ability", function() {
            it("should make your votes count as reverse", function () {
                 allPlayersPass(game);
                (function() { game.onCommand("cylonpolitician", {id: "airlock", target: "roslin"}); }).should.not.throw();
                game.yesVotes.should.be.exactly(0);
                game.noVotes.should.be.exactly(0);
                (function() { game.onCommand("cylonpolitician", {id: "vote", votedYes: true}); }).should.not.throw();
                game.yesVotes.should.be.exactly(0);
                game.noVotes.should.be.exactly(1);
            });
        });
        describe("Protect ability", function() {
            it("should protect from a kill order", function () {
                var numPlayers = game.getAlivePlayers().length;
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: ["tomzarek"]});}).should.not.throw();
                (function() {game.onCommand("doctor", {id: "protect", targets: ["tomzarek"]});}).should.not.throw();
                game.forceEndNight();
                game.getAlivePlayers().length.should.be.exactly(numPlayers);
                (function() {game.getAlivePlayerByNickOrThrow("tomzarek");}).should.not.throw();
            });
        });
        describe("Night cycle", function() {
            it("it should become day when all players have used their abilities/passed", function () {
                game.isNight.should.be.true;
                allPlayersPass(game);
                game.isNight.should.be.false;
            });
            it("abilities should be resolved after cycle", function () {
                game.isNight.should.be.true;
                var numPlayers = game.getAlivePlayers().length;
                (function() {game.onCommand("number2", {id: "kill", targets: ["tomzarek"]});}).should.not.throw();
                _.forEach(game.getAlivePlayers(), function(player, key) {
                    if(player.nick != "number2") {
                        (function () {
                            (function() {game.onCommand(player.nick, {id: "pass"});}).should.not.throw();
                        }).should.not.throw();
                    }
                });
                game.isNight.should.be.false;
                game.getAlivePlayers().length.should.be.exactly(numPlayers-1);
                (function() {game.getAlivePlayerByNickOrThrow("tomzarek"); }).should.throw();
            });
        });
    });
    describe("Game flow", function() {
        var game;
        beforeEach(function(done) {
            initGameWithAllRoles(function(instance) {
                game = instance;
                done();
            })
        });
        it("it should end in Cylon victory when humans are dead", function () {
            while(true) {
                // Night
                game.isNight.should.be.true;
                (function() {game.onCommand("number2", {id: "kill", targets: [game.getAlivePlayersFromFaction("Human")[0].nick]});}).should.not.throw();
                _.forEach(game.getAlivePlayers(), function(player, key) {
                    if(player.nick != "number2") {
                        (function () {
                            (function() {game.onCommand(player.nick, {id: "pass"});}).should.not.throw();
                        }).should.not.throw();
                    }
                });

                if(game.getAlivePlayersFromFaction("Human").length === 0) {
                    break;
                }

                // Day
                game.isNight.should.be.false;
                passVoting(game);
            }
            game.isFinished.should.be.true;
        });
    });
});
