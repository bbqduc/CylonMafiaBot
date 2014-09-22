/**
 *
 * Created by johannes on 21/09/14.
 */

var utils = require("../utils");
var Detective = function()
{
    this.commandWord = "investigate";
    this.abilityDescription = "Find out what faction a player belongs to. Usage: !" + this.commandWord + " targetNick";
    this.target = null;
    this.enabledNight = true;
    this.enabledDay = false;
    this.abilityCallback = function(game, abilityParameters) {
        var target = abilityParameters.targets[0];
        abilityParameters.actor.sendMessage(target.nick + " belongs to the faction " + target.role.FACTION + ".");
    };
    this.parseCommand = function(game, restString) {
        var split = utils.getWhiteSpaceSeparatedParameters(restString, 1);
        var targets = [];
        targets[0] = game.getAlivePlayerByNickOrThrow(split[0]);
        return targets;
    };
};

module.exports = Detective;
