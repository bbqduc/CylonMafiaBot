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
    _.forEach(this.abilities, function (element, index) {
        this.commandWords.push(element.commandWord);
    }, this);
    this.abilityUsed = false;
};

Role.prototype.getInitialMessage = function() {
    var ret = "You are a " + this.name + ".";

    ret += "\nHere is a list of your abilities:";
    _.forEach(this.abilities, function (element, index) {
        ret += element.commandWord + ": " + element.abilityDescription + "\n";
    });

    return ret;
};
Role.prototype.NAME = "";
Role.prototype.FACTION = "";
Role.prototype.winResolver = new FactionWinResolver(Role.prototype.FACTION);
Role.prototype.resolveWin = function(game) {
    return this.winResolver.resolveWin(game, this);
};
Role.prototype.parseCommand = function(commandWord, restString, game, actor) {
    var ability = _.find(this.abilities, {"commandWord" : commandWord});
    if(ability == null) {
        throw new Error("No such command: " + commandWord);
    }
    if(this.abilityUsed) {
        throw new Error("Already used an ability tonight.");
    }
    if(game.isNight && !ability.enabledNight) {
        throw new Error("Can't use that ability during the night.");
    } else if(!game.isNight && !ability.enabledDay) {
        throw new Error("Can't use that ability during the day.");
    }
    var targets = ability.parseCommand(game, restString);
    game.useAbility(ability, actor, targets);
    this.abilityUsed = true;
};
Role.prototype.newDayCallback = function() {
    this.abilityUsed = false;
};

module.exports = Role;
