var _ = require("lodash");
var Player = function(nick, game) {
    this.nick = nick;
    this.dead = false;
    this.game = game;
    this.killedBy = null;
    this.killMessage = null;

    this.commandHandlers = {
        "vote": {callBack: Player.prototype.vote.bind(this), description: "Take part in an ongoing vote. Usage: !vote yes|no|y|n"},
        "pass": {callBack: Player.prototype.passTurn.bind(this), description: "Skip using an ability during the night."},
        "airlock": {callBack: Player.prototype.callAirlockVote.bind(this), description: "Call a vote to throw someone out of the airlock. Usage: !airlock [targetNick]. Just !airlock will call a vote to skip airlocking for today."}
    };
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

Player.prototype.sendMessage = function(message) {
    this.game.communicationInterface.sendPrivateMessage(this.nick, message);
};

Player.prototype.onCommand = function(commandWord, restString) {
    if(this.commandHandlers[commandWord] == null) {
        if(this.role != null) {
            this.role.parseCommand(commandWord, restString, this.game, this);
        }
    } else {
        this.commandHandlers[commandWord].callBack(restString);
    }
};

Player.prototype.callAirlockVote = function(restString) {
    this.game.callAirlockVote(this, restString);
};

Player.prototype.newDayCallback = function() {
    this.role.newDayCallback();
}

Player.prototype.passTurn = function() {
    this.role.abilityUsed = true;
	 this.sendMessage("Command PASS registered.");
    this.game.nextDayIfAllPlayersDone();
};

Player.prototype.vote = function(restString) {
    restString = restString.trim();
    var cmpString = restString.toUpperCase();
    var votedYes = null;
    if(cmpString === "YES" || cmpString === "Y") {
        votedYes = true;
    }
    else if(cmpString === "NO" || cmpString === "N") {
        votedYes = false;
    }

    if(votedYes === null) {
       throw new Error("Couldn't parse a yes/no vote from " + restString);
    }
    var votes = this.role.vote(votedYes);
    this.game.registerVote(this, votedYes, votes.yesEffect, votes.noEffect);
};

module.exports = Player;
