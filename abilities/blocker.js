/**
 *
 * Created by johannes on 20/09/14.
 */

var utils = require("../utils");
var Blocker = function()
{
    this.commandWord = "block";
    this.abilityDescription = "Block another player from performing any actions during the night. Usage : !" + this.commandWord + " targetNick";
    this.target = null;
    this.enabledNight = true;
    this.enabledDay = false;
    this.blockingListener = function(game, abilityParameters)
    {
        if(abilityParameters.actor === this.target) {
            abilityParameters.actor.sendMessage("Your action was blocked!"); // TODO : more interesting messages! Like different stuff for bartender etc
            return false;
        }
    };
    this.abilityCallback = function(game, abilityParameters) {
        this.target = abilityParameters.targets[0];
        game.addAbilityActorListener(this.target, this.blockingListener);
    };
    this.parseCommand = function(game, restString) {
        var split = utils.getWhiteSpaceSeparatedParameters(restString, 1);
        var targets = [];
        targets[0] = game.getAlivePlayerByNickOrThrow(split[0]);
        return targets;
    };
}

module.exports = Blocker;
