var _ = require("lodash");
var Persistence = require('./model');
var Promise = require("bluebird");
var Player = function(nick, game) {
    this.nick = nick;
    this.dead = false;
    this.game = game;
    this.killedBy = null;
    this.killMessage = null;

    this.votesCalled = 0;
    this.passedVotesCalled = 0;
    this.playersKilled = 0;
    this.wonGame = false;
    this.numVotedYes = 0;
    this.numVotedNo = 0;

    this.commandHandlers = {
        "vote": {callBack: Player.prototype.vote.bind(this), description: "Take part in an ongoing vote. Usage: !vote yes|no|y|n"},
        "pass": {callBack: Player.prototype.passTurn.bind(this), description: "Skip using an ability during the night."},
        "airlock": {callBack: Player.prototype.callAirlockVote.bind(this), description: "Call a vote to throw someone out of the airlock. Usage: !airlock [targetNick]. Just !airlock will call a vote to skip airlocking for today."}
    };
};

Player.prototype.fetchDBInstance = function() {
    var self = this;
    return Persistence.DB("Players")
        .where({name: this.nick})
        .first("id")
        .then(function(playerInstanceId) {
            if(playerInstanceId) {
                return new Promise(function(resolve) {resolve([playerInstanceId.id])});
            } else {
                return Persistence.DB("Players")
                    .insert({name: self.nick}, "id");
            }
        }).catch(function(e) {
            return Persistence.DB("Players")
                .where({name: self.nick})
                .first("id")
                .then(function(playerInstanceId) {
                    return new Promise(function(resolve) {resolve([playerInstanceId.id])});
                });
        }).then(function(playerInstanceId) {
            self.persistPlayerId = playerInstanceId[0];
        });
};

Player.prototype.getCommandsString = function() {
	var ret = "";
	_.forOwn(this.commandHandlers, function(value, name) {
		ret += "!" + name + " : " + value.description + "\n";
	});
	if(this.role != null) {
		ret += this.role.getInitialMessage();
	}
	return ret;
};

Player.prototype.getPersistObject = function() {
    var self = this;
    if(this.persistPlayer == null) {
        return this.fetchDBInstance()
            .then(function() {
                return self.persistPlayer;
            });
    } else {
        return new Promise(function(resolve, reject) {
            resolve(self.persistPlayer);
        });
    }
};

Player.prototype.validateMessage = function(message) {
    if(message.sender != null && message.sender != this.id) {
        throw new Error("You can't send a message as someone else.");
    }
    if(message.to.faction != null && message.to.faction != p.role.FACTION) {
        throw new Error("You can't send messages to that faction.");
    }
};
Player.prototype.sendMessage = function(message) {
    this.game.communicationInterface.sendPrivateMessage(this.nick, message);
};

Player.prototype.validateMessage = function(message) {
};

Player.prototype.onMessage = function(message) {
    if(message.to === "public") {
        return; // handled by communicationinterface
    }
};
Player.prototype.onCommand = function(command, isPublic) {
    if(this.dead) {
        throw new Error("You are dead.");
    }
    var wasCommand = false;
    if(this.commandHandlers[command.id] == null) {
        if(this.role != null && !isPublic) {
            wasCommand = this.role.registerCommand(command, this.game, this);
        }
    } else {
        this.commandHandlers[command.id].callBack(command);
        wasCommand = true;
    }
    return wasCommand;
};

Player.prototype.callAirlockVote = function(command) {
    this.game.callAirlockVote(this, command.target);
};

Player.prototype.newDayCallback = function() {
    this.role.newDayCallback();
};

Player.prototype.passTurn = function() {
    this.role.abilityUsed = true;
	 this.sendMessage("Command PASS registered.");
    this.game.nextDayIfAllPlayersDone();
};

Player.prototype.vote = function(command) {
    if(command.votedYes === null) {
       throw new Error("Couldn't parse a yes/no vote from " + command.toString());
    }
    var votes = this.role.vote(command.votedYes);
    this.game.registerVote(this, command.votedYes, votes.yesEffect, votes.noEffect);
};

module.exports = Player;
