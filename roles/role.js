/**
 * Created by johannes on 20/09/14.
 */

var _ = require("lodash");
var FactionWinResolver = require("../winresolvers/factionwinresolver");
var Role = function() {
    if(this.abilities == null) {
        this.abilities = [];
    }
    this.commandWords = [];
	 this.votingPower = 1;
    _.forEach(this.abilities, function (element, index) {
        if(element.commandWord != null) {
            this.commandWords.push(element.commandWord);
        }
        if(element.votingPower) {
            this.votingPower += element.votingPower;
        }
    }, this);
    this.abilityUsed = false;
};

Role.prototype.getInitialMessage = function(game) {
    var ret = "You are " + this.NAME + ".\n";
    ret += this.winResolver.getInitialMessage(this, game);

    ret += "\nHere is a list of your abilities:\n";
    _.forEach(this.abilities, function (element, index) {
        if(element.commandWord != null) {
            ret += element.commandWord + ": " + element.abilityDescription + "\n";
        } else {
            ret += "Passive: " + element.abilityDescription + "\n";
        }
    });

    return ret;
};
Role.prototype.NAME = "";
Role.prototype.FACTION = "";
Role.prototype.winResolver = new FactionWinResolver(Role.prototype.FACTION);
Role.prototype.resolveWin = function(game) {
    return this.winResolver.resolveWin(game, this);
};
Role.prototype.registerCommand = function(command, game, actor) {
    var ability = _.find(this.abilities, {"commandWord" : command.id});
    if(ability == null) {
        //throw new Error("No such command: " + commandWord); 
		  return false;
    }
    if(this.abilityUsed) {
        throw new Error("Already used an ability tonight.");
    }
    var targets = ability.validateCommand(game, command, actor);
    game.useAbility(ability, actor, targets);
    this.abilityUsed = true;
    actor.sendMessage("Command " + command.id + " registered.");
    game.nextDayIfAllPlayersDone();
    return true;
};

Role.prototype.newDayCallback = function() {
    this.abilityUsed = this.commandWords.length === 0;
};

Role.prototype.vote = function(showYesVote) {
    var ret = {yesEffect: 0, noEffect: 0};
	 if(showYesVote === true) {
		 ret.yesEffect = this.votingPower;
	 } else if(showYesVote === false) {
		 ret.noEffect = this.votingPower;
	 }
    _.forEach(this.abilities, function (ability, index) {
        if(typeof(ability.voteCallback) === "function") {
            ability.voteCallback(showYesVote, ret);
        }
    });
    return ret;
};

module.exports = Role;
