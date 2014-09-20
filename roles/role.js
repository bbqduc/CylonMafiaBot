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

module.exports = Role;
