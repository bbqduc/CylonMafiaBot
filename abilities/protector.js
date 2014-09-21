/**
 *
 * Created by johannes on 21/09/14.
 */

var utils = require("../utils");
var Protector = function()
{
    this.commandWord = "protect";
    this.abilityDescription = "Protect another player against death during the night. Usage: !" + this.commandWord + " targetNick";
    this.target = null;
    this.enabledNight = true;
    this.enabledDay = false;
    this.abilityCallback = function(game, abilityParameters) {
        var target = abilityParameters.targets[0];
        if(target.dead) {
            target.dead = false;
            target.sendMessage("Someone saved you from death!");
            target.killedBy.sendMessage("Someone saved your target!");
        }
    };
    this.parseCommand = function(game, restString) {
        var split = utils.getWhiteSpaceSeparatedParameters(restString, 1);
        var targets = [];
        targets[0] = game.getAlivePlayerByNickOrThrow(split[0]);
        return targets;
    };
};

module.exports = Protector;
