/**
 *
 * Created by johannes on 20/09/14.
 */

require('irc-colors').global()
var _ = require("lodash");
var Player = require("./player");
var roleClasses = require("./roles");
var abilities = require("./abilities" );
var Promise = require("bluebird");

var Persistence = require('./model');

"use strict";
var DummyCommunicationInterface = function()
{
    this.sentPublicMessages = [];
    this.sentPrivateMessages = [];
    this.sendPublicMessage = function(message) {
        this.sentPublicMessages.push(message);
    };

    this.sendPrivateMessage = function(targetNick, message) {
        this.sentPrivateMessages.push({recipient: targetNick, message: message});
    };
};

// onMessage
// onCommand
//


var Game = function(finishedCallback)
{
    this.communicationInterface = new DummyCommunicationInterface();

    this.finishedCallback = finishedCallback;
    this.numMessages = 0;
    this.numCommands = 0;
    this.players = {};
    this.killedPlayers = [];
    this.currentDay = 0;
    this.isNight = false;
    this.isStarted = false;
    this.isFinished = false;
    this.abilityActorListeners = {};
    this.abilityTargetListeners = {};
    this.abilitiesUsed = [];

    this.voteTargetsResolved = [];
    this.voteInProgress = false;
    this.airlockVoteTarget = null;
    this.yesVotes = 0;
    this.noVotes = 0;
    this.votedPlayers = [];



    // TODO : this doesn't belong here!
    this.abilityOrdering = [
        "blocker",
        "swapper",
        "killer",
        "detective",
        "protector"
    ];

    _.forOwn(abilities, function(role, name) {
        if(name != "role" && !_.contains(this.abilityOrdering, name)) {
            this.abilityOrdering.push(name);
        }
    }, this);

    _.forEach(this.abilityOrdering, function(name, index) {
        abilities[name].prototype.RESOLVEORDER = index;
    });

    Game.prototype.startServing = function() {};

    Game.prototype.forceEndNight = function() {
        if(this.isNight) {
            this.communicationInterface.sendPublicMessage("Forcing end of night.");
            this.resolveAbilities();
        }
    };

    Game.prototype.abortGame = function(sender) {
        if(sender === "bduc") {
            this.communicationInterface.sendPublicMessage("Resetting.");
            this.finishedCallback(this);
        }
    };

    Game.prototype.printPlayers = function(sender) {
        var nicks = _.pluck(this.getAlivePlayers(), "nick");
        if(nicks.length == 0) {
            this.communicationInterface.sendPrivateMessage(sender, "No players.");
        } else {
            this.communicationInterface.sendPrivateMessage(sender, "Alive players: " + nicks.join(", "));
        }
    };

    Game.prototype.getPlayersFromFaction = function(faction) {
        return _.filter(this.players, function(player) {
            return (player.role != null) && player.role.FACTION === faction;
        });
    };

    Game.prototype.getTotalVotingPower = function() {
        return _(this.getAlivePlayers()).reduce(function(sum, player) {
            return sum + player.role.votingPower;
        }, 0);
    };

    Game.prototype.getAlivePlayersFromFaction = function(faction) {
        return _.filter(this.getPlayersFromFaction(faction), {'dead': false});
    };

    Game.prototype.victoryCheck = function() {
        var playersAliveAreAllWinners = true;
        _.forEach(this.getAlivePlayers(), function(player, key) {
            playersAliveAreAllWinners = playersAliveAreAllWinners && player.role.resolveWin(this);
        }, this);
        if(playersAliveAreAllWinners) {
            this.isFinished = true;
            this.communicationInterface.sendPublicMessage("========= Game Finished =========");
            var winners = [];
            var losers = [];
            var self = this;
            var playedGamePromises = []
            _.forOwn(this.players, function(player, nick) {
                if(player.role.resolveWin(this)) {
                    winners.push(player.nick + " (" + player.originalRole.NAME + ")");
                    player.wonGame = true;
                } else {
                    losers.push(player.nick + " (" + player.originalRole.NAME + ")");
                    player.wonGame = false;
                }
                playedGamePromises.push(Persistence.DB("PlayedGames")
                    .where({player_id: player.persistPlayerId,
                        game_id: self.persistGameId})
                    .update({
                        won_game: player.wonGame,
                        killed_players: player.playersKilled,
                        voted_yes: player.numVotedYes,
                        voted_no: player.numVotedNo,
                        passed_votes_called: player.passedVotesCalled,
                        votes_called: player.votesCalled
                    }).then());
            }, this);
            this.communicationInterface.sendPublicMessage("Winners: " + winners.join(", "));
            this.communicationInterface.sendPublicMessage("Not-Winners: " + losers.join(", "));
            Persistence.DB("Games")
                    .where({id: this.persistGameId})
                    .update({
                        end_time: new Date(),
                        finished: true
                    }).then(function() {
                    self.communicationInterface.sendPublicMessage("Game #" + self.persistGameId + " concluded.");
                    if(typeof(self.finishedCallback) === "function") {
                        self.finishedCallback(self);
                    }
                });
            return true;
        }
        return false;
    };

    Game.prototype.getAlivePlayers = function() {
        return _.filter(this.players, {'dead': false});
    };

    Game.prototype.addPlayer = function(sender) {
        if(this.isStarting) {
            this.communicationInterface.sendPublicMessage("Cannot join an ongoing game!");
            return false;
        }
        if(this.players[sender] == null) {
            this.players[sender] = new Player(sender, this);
            this.communicationInterface.sendPublicMessage(_.size(this.players) + " players.");
        }
        return true;
    };
    Game.prototype.removePlayer = function(nick)
    {
        if(this.isStarting) {
            this.communicationInterface.sendPublicMessage("Cannot leave an ongoing game!");
            return false;
        }
        if(this.players[nick] != null) {
            delete this.players[nick];
            this.communicationInterface.sendPublicMessage(_.size(this.players) + " players.");
        }
        return true;
    };

    /*    Game.prototype.onPublicMessage = function(sender, message) {
     message = message.trim();
     if(message.length > 1 && message[0] == '!') {
     var args = this.parseCommand(message.substr(1));
     this.handlePublicCommand(sender, args.commandWord, args.restString);
     }
     };

     Game.prototype.onPrivateMessage = function(sender, message) {
     message = message.trim();
     if(message.length > 1 && message[0] == '!') {
     var args = this.parseCommand(message.substr(1));
     this.handlePrivateCommand(sender, args.commandWord, args.restString);
     }
     };

     Game.prototype.parseCommand = function(message) {
     var splitPoint = message.search(/\s/); // split on first whitespace
     var command = splitPoint === -1 ? message : message.substr(0, splitPoint);
     var restString = splitPoint === -1 ? "" : message.substr(splitPoint).trim();
     return {commandWord: command, restString: restString};
     };


     Game.prototype.handlePublicCommand = function(sender, commandWord, restString) {
     try {
     if (this.commandHandlers[commandWord] != null) {
     this.commandHandlers[commandWord].callBack(sender, restString);
     } else if (this.players[sender] != null && !this.players[sender].dead) {
     this.players[sender].onCommand(commandWord, restString);
     }
     } catch(e) {
     var msg = typeof(e) === "string" ? e : e.toString();
     if(msg === undefined) {
     msg = "Unknown error happened :o";
     }
     this.communicationInterface.sendPublicMessage(msg);
     }
     };

     Game.prototype.handlePrivateCommand = function(sender, commandWord, restString) {
     try {
     if (this.commandHandlers[commandWord] != null) {
     this.commandHandlers[commandWord].callBack(sender, restString);
     } else if (this.players[sender] != null && !this.players[sender].dead) {
     this.players[sender].onCommand(commandWord, restString);
     }
     } catch(e) {
     this.communicationInterface.sendPrivateMessage(e.toString());
     }
     }; */

    Game.prototype.determineRoles = function() {
        var cylonRoles = [];
        var humanRoles = [];

        _.forOwn(roleClasses, function (role, name) {
            if (role == roleClasses.role || role == roleClasses.number2) {
                return;
            }
            if (role.prototype.FACTION === "Cylon") {
                cylonRoles.push(new role());
            } else {
                humanRoles.push(new role());
            }
        });
        var numberOfCylons = Math.floor(_.size(this.players) / 3.0);
        if (cylonRoles.length+1 < numberOfCylons || humanRoles.length < _.size(this.players) - numberOfCylons) {
            throw new Error("Oops, not enough roles for all players!");
        }
        cylonRoles = _.shuffle(cylonRoles);
        humanRoles = _.shuffle(humanRoles);
        var roles = [];
        roles[0] = new roleClasses.number2();
        for (i = 1; i < numberOfCylons; ++i) {
            roles[i] = cylonRoles[i-1];
        }
        for(i = numberOfCylons; i < _.size(this.players); ++i) {
            roles[i] = humanRoles[i-numberOfCylons];
        }
        roles = _.shuffle(roles);
        i = 0;
        _.forOwn(this.players, function(player)
        {
            roles[i].player = player;
            player.role = roles[i++];
            player.originalRole = player.role;
        }, this);

        _.forOwn(this.players, function(player) {
            this.communicationInterface.sendPrivateMessage(player.nick, player.role.getInitialMessage(this));
        }, this);

        var promises = [];
        var self = this;
        _.forOwn(this.players, function(p) {
            promises.push(p.fetchDBInstance().then(function() {
                return Persistence.DB("Roles")
                    .where({name: p.role.NAME})
                    .first("id")
            }).then(function(roleInstanceId) {
                if(!roleInstanceId) {
                    return Persistence.DB("Roles")
                        .insert({name: p.role.NAME}, "id");
                } else {
                    return new Promise(function(resolve) { resolve([roleInstanceId.id]);})
                }
            }).then(function(roleInstanceId){
                p.role.persistRoleId = roleInstanceId[0];
                return Persistence.DB("PlayedGames")
                    .insert({game_id: self.persistGameId,
                        player_id: p.persistPlayerId,
                        role_id: p.role.persistRoleId
                    })
            }));
        });
        return Promise.all(promises);
    };

    Game.prototype.startGame = function()
    {
        if(this.isStarting) {
            throw new Error("Game already running.");
        }
        this.numMessages = 0;
        this.numCommands = 0;
        var self = this;
        if(_.size(this.players) < 4) {
            throw new Error("Not much point to play with under 4 people!");
        }
        this.isStarting = true;
        return Persistence.DB("Games")
            .insert({start_time: new Date(), end_time: null, finished: false}, "id")
            .then(function (gameId) {
                self.persistGameId = gameId[0];
            }).then(function() {
                self.isStarting = true;
                self.communicationInterface.sendPublicMessage("Game #" + self.persistGameId + " starting!");
                return self.determineRoles();
            }).then(function(){
                self.advanceToNight();
                self.isStarted = true;
            });
    };

    Game.prototype.detectNewDeadPeople = function()
    {
        _.forOwn(this.players, function(player, nick) {
            if(player.dead && !(_.contains(this.killedPlayers, nick))) {
                this.communicationInterface.sendPublicMessage(nick + "(" + player.originalRole.NAME + ") was brutally murdered during the night!");
                if(player.killMessage != "")
                    this.communicationInterface.sendPublicMessage("The killer left a message : " + player.killMessage);
                this.killedPlayers.push(nick);
                player.killedBy.playersKilled++;
            }
        }, this);
    }
    Game.prototype.advanceToNextDay = function()
    {
        this.voteTargetsResolved = [];
        this.detectNewDeadPeople();
        this.lastCylonCheck();
        if(!this.victoryCheck()) {
            this.currentDay++;
            this.isNight = false;
            this.communicationInterface.sendPublicMessage("=========== DAY " + this.currentDay + "===========");
            this.resetAbilities();
            this.triggerNewDayCallbacks();
        }
    };

    Game.prototype.triggerNewDayCallbacks = function() {
        _.forEach(this.getAlivePlayers(), function(player, index) {
            player.newDayCallback();
        });
    };

    Game.prototype.getAlivePlayerByNickOrThrow = function(nick) {
        if(this.players[nick] == null || this.players[nick].dead) {
            throw new Error("No living player named " + nick + " in the game.");
        };
        return this.players[nick];
    };

    Game.prototype.getPlayerByNickOrThrow = function(nick) {
        if(this.players[nick] == null) {
            throw new Error("No player named " + nick + " in the game.");
        };
        return this.players[nick];
    };

    Game.prototype.isNightDone = function() {
        var allUsed = true;
        _.forEach(this.getAlivePlayers(), function(player, key) {
            allUsed = allUsed && (player.role.commandWords.length === 0 || player.role.abilityUsed);
        }, this);
        return allUsed;
    };

    Game.prototype.nextDayIfAllPlayersDone = function() {
        if(this.isNightDone()) {
            this.resolveAbilities();
        }
    };

    Game.prototype.useAbility = function(ability, actor, targets) {
        this.abilitiesUsed.push({ability: ability, actor: actor, targets: targets});
        this.nextDayIfAllPlayersDone();
    };

    Game.prototype.resetListeners = function() {
        this.abilityActorListeners = {};
        this.abilityTargetListeners = {};
        _.forEach(this.getAlivePlayers(), function (player, index) {
            this.abilityActorListeners[player.nick] = [];
            this.abilityTargetListeners[player.nick] = [];
        }, this);
    };

    Game.prototype.resolveAbilities = function() {
        this.abilitiesUsed = _.sortBy(this.abilitiesUsed, function(entry) { return entry.ability.RESOLVEORDER });
        this.resetListeners();
        _.forEach(this.abilitiesUsed, function(abilityParameters) {
            var notBlocked = this.launchListeners(abilityParameters);
            if(notBlocked) {
                abilityParameters.ability.abilityCallback(this, abilityParameters);
            }
        }, this);
        this.advanceToNextDay();
    };
    Game.prototype.resetAbilities = function() {
        this.abilitiesUsed = [];
    };

    Game.prototype.launchListeners = function(abilityParameters)
    {
        var notBlocked = true;
        _.forEach(this.abilityActorListeners[abilityParameters.actor.nick], function(listener, key) {
            notBlocked = notBlocked && (listener(this, abilityParameters) !== false);
        });
        _.forEach(abilityParameters.targets, function(target, index) {
            _.forEach(this.abilityTargetListeners[target.nick], function (listener, key) {
                notBlocked = notBlocked && (listener(this, abilityParameters) !== false);
            });
        }, this);
        return notBlocked;
    }

    Game.prototype.addAbilityActorListener = function(target, listener) {
        this.abilityActorListeners[target.nick].push(listener);
    };

    Game.prototype.addAbilityTargetListener = function(target, listener) {
        this.abilityTargetListeners[target.nick].push(listener);
    };

    Game.prototype.registerVote = function(player, showYesVote, yesEffect, noEffect) {
        if(!this.isStarted) {
            throw new Error("Can't vote before the game has started.");
        }
        if(!this.voteInProgress) {
            throw new Error("No vote in progress.");
        }
        if(_.contains(this.votedPlayers, player.nick)) {
            throw new Error("Can't vote more than once.");
        }
        if(showYesVote === true) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "YES".irc.bold.green());
        }
        else if(showYesVote === false) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "NO".irc.bold.red());
        }
        else { throw new Error("Vote " + votedYes + " not recognized."); }
        this.yesVotes += yesEffect;
        this.noVotes += noEffect;
        this.votedPlayers.push(player.nick);
        if(this.votedPlayers.length == _.size(this.getAlivePlayers()) || this.yesVotes > (this.getTotalVotingPower() / 2) || this.noVotes >= (this.getTotalVotingPower() / 2)) {
            this.resolveVote();
        }
    };

    Game.prototype.resetVote = function() {
        this.airlockVoteTarget = null;
        this.voteCaller = null;
        this.voteInProgress = false;
        this.yesVotes = 0;
        this.noVotes = 0;
        this.votedPlayers = [];
    };

    Game.prototype.advanceToNight = function() {
        this.lastCylonCheck();
        this.isNight = true;
        this.communicationInterface.sendPublicMessage("=========== NIGHT " + this.currentDay + "===========");
        this.nextDayIfAllPlayersDone();
    };

    Game.prototype.lastCylonCheck = function() {
        var cylons = this.getAlivePlayersFromFaction("Cylon");
        if(cylons.length === 1 && cylons[0].role.NAME != "Cylon Number 2") {
            cylons[0].role = new roleClasses.number2();
            this.communicationInterface.sendPrivateMessage(cylons[0].nick, "You're the last cylon alive, and you have been granted the power to kill.");
        }
    };

    Game.prototype.resolveVote = function() {
        if(this.yesVotes > this.noVotes) {
            var message = "Motion passes. ";
            if(this.airlockVoteTarget == null) {
                message += "The airlock gets no exercise today.";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " (" + this.airlockVoteTarget.originalRole.NAME + ") is thrown out of the airlock."
                this.airlockVoteTarget.dead = true;
                this.killedPlayers.push(this.airlockVoteTarget.nick);
            }
            this.voteCaller.passedVotesCalled++;
            this.communicationInterface.sendPublicMessage(message);
            this.resetVote();
            if(!this.victoryCheck()) {
                this.advanceToNight();
            }
        } else {
            var message = "Motion fails. ";
            if(this.airlockVoteTarget == null) {
                message += "The people want justice!";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " stays alive.";
            }
            this.communicationInterface.sendPublicMessage(message);
            if(this.airlockVoteTarget != null) {
                this.voteTargetsResolved.push(this.airlockVoteTarget.nick);
            }
            if(this.voteTargetsResolved.length >= this.getAlivePlayers().length+1) {
                this.communicationInterface.sendPublicMessage("Admiral Adama says: No more voting for today.");
                this.advanceToNight();
            }
            this.resetVote();
        }
    };

    Game.prototype.callAirlockVote = function(actor, playerName) {
        if(!this.isStarted) {
            throw new Error("Can't call a vote before the game has started.");
        }
        if(this.isNight) {
            throw new Error("Can't call a vote at night.");
        }
        if(this.voteInProgress) {
            throw new Error("There is already a vote in progress.");
        }
        var player;
        if(playerName != null && _.contains(this.voteTargetsResolved, playerName)) {
            throw new Error("That vote has already been attempted today.");
        }
        if(playerName == null) {
            player = null; // call a vote to not airlock anyone
            this.communicationInterface.sendPublicMessage(actor.nick + " has called a vote to skip throwing anyone out of the airlock today.");
        } else {
            player = this.getAlivePlayerByNickOrThrow(playerName);
            this.communicationInterface.sendPublicMessage(actor.nick + " has called a vote to throw " + playerName.irc.bold() + " out of the airlock!");
        }
        this.airlockVoteTarget = player;
        this.voteInProgress = true;
        this.voteCaller = actor;
        this.voteCaller.votesCalled++;
    };

    Game.prototype.getCommandsString = function(sender) {
        var ret = "";
        _.forOwn(this.commandHandlers, function(value, name) {
            ret += "!" + name + " : " + value.description + "\n";
        });
        var player = this.players[sender];
        if(player != null) {
            ret += player.getCommandsString();
        }
        this.communicationInterface.sendPrivateMessage(sender, ret);
    };

    this.commandHandlers = {
        "join": {callBack: Game.prototype.addPlayer.bind(this), description: "Join a game that hasn't yet started."},
        "j": {callBack: Game.prototype.addPlayer.bind(this), description: "Join a game that hasn't yet started."},
        "start": {callBack: Game.prototype.startGame.bind(this), description: "Start a game."},
        "leave": {callBack: Game.prototype.removePlayer.bind(this), description: "Leave a game that hasn't yet started."},
        "l": {callBack: Game.prototype.removePlayer.bind(this), description: "Leave a game that hasn't yet started."},
        "players": {callBack: Game.prototype.printPlayers.bind(this), description: "Get a list of alive players."},
        "commands": {callBack: Game.prototype.getCommandsString.bind(this), description: "Get a list of available commands."},
        "endnight": {callBack: Game.prototype.forceEndNight.bind(this), description: "Force end of night. (only works if you're the admin)"},
        "abort": {callBack: Game.prototype.abortGame.bind(this), description: "Abort the current game. (only works if you're the admin)"}
    };

    /* Called when a textual mesasge (not a command) is sent by a player.
     * message fields:
     *	sender -- who should appear as the sender if different from actual sender
     *	text -- text content of message
     *	to  -- public, faction, private (or more sophisticated) (perhaps a way to
     *	create an ad-hoc channel)
     * */
    Game.prototype.onMessage = function(sender, message) {
        if(!this.isStarted || this.isFinished || this.players[sender] == null) return;
        this.validateMessage(sender, message);
        _.forOwn(this.players, function(player, nick) {
            player.onMessage(message); // if it concerns the player, the message will be sent to his client
        }, this);
        this.logMessage(sender, message, this.numMessages++, this.currentDay*2+(this.isNight ? 0 : 1));
    };

    Game.prototype.validateMessage = function(sender, message) {
        var p = this.players[sender];
        if(p.isDead) {
            throw new Error("Dead men don't tell tales.");
        }
        p.validateMessage(message);
        if(message.to.private != null) {
            if(!_.isArray(message.to.private)) {
                if(this.getPlayerByNickOrThrow(message.to.private).isDead) {
                    throw new Error("Can't talk to dead people.");
                }
                message.to.private = [message.to.private];
            }
            var deleteIndices = [];
            _.forEach(message.to.private, function(toPlayer, index) {
                if(toPlayer.isDead) {
                    deleteIndices.push(index);
                }
            });
            _.forEach(deleteIndices, function(toDelete) {
                delete message.to.private[toDelete];
            });
        }
    };

    Game.prototype.onCommand = function(sender, command, isPublic) {
        var wasCommand = false;
        if (this.commandHandlers[command.id] != null) {
            this.commandHandlers[command.id].callBack(sender, command);
            wasCommand = true;
        } else {
            if(this.players[sender] == null) return;
            wasCommand = this.players[sender].onCommand(command, isPublic);
        }
        if(wasCommand) {
            this.logCommand(sender, command, this.numCommands++, this.currentDay*2+(this.isNight ? 0 : 1));
        }
        return wasCommand;
    };

    Game.prototype.logMessage = function(sender, message, ordinal, turn) {
        if(this.players[sender] == null || !this.isStarted) return;
        var self = this;
        Persistence.DB("Messages").insert({
                game_id: self.persistGameId,
                player_id: self.players[sender].persistPlayerId,
                time: new Date(),
                text: message.text,
                properties: _.omit(message, "text"),
                nth_in_game: ordinal,
                turn: turn
            }
        ).then();
    };

    Game.prototype.logCommand = function(sender, command, ordinal, turn) {
        if(this.players[sender] == null || !this.isStarted) return;
        var self = this;
        Persistence.DB("Commands").insert({
            game_id: self.persistGameId,
            player_id: self.players[sender].persistPlayerId,
            time: new Date(),
            properties: command,
            nth_in_game: ordinal,
            turn: turn
        }).then();
    };
};

module.exports = Game;
