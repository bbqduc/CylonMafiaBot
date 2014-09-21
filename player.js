var Player = function(nick, game) {
    this.nick = nick;
    this.dead = false;
    this.game = game;
    this.killedBy = null;
    this.killMessage = null;

    this.commandHandlers = {
        "vote": Player.prototype.vote.bind(this),
        "pass": Player.prototype.passTurn.bind(this),
        "airlock": Player.prototype.callAirlockVote.bind(this)
    };
};

Player.prototype.sendMessage = function(message) {
    this.game.communicationInterface.sendPrivateMessage(this.nick, message);
};

Player.prototype.onCommand = function(commandWord, restString) {
    if(this.commandHandlers[commandWord] == null) {
        this.role.parseCommand(commandWord, restString, this.game, this);
    } else {
        this.commandHandlers[commandWord](restString);
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
    this.game.registerVote(this, votedYes);
};

module.exports = Player;
