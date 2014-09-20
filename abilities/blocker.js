/**
 *
 * Created by johannes on 20/09/14.
 */

var Blocker = function()
{
    this.commandWord = "block";
    this.abilityDescription = "Block another player from performing any actions during the night. Usage : !" + this.commandWord + " targetNick";
    this.target = null;
    this.blockingListener = function(game, abilityParameters)
    {
        if(this.actor === target) {
            actor.sendMessage("Your action was blocked!"); // TODO : more interesting messages! Like different stuff for bartender etc
            return false;
        }
    };
    this.abilityCallback = function(game, abilityParameters) {
        this.target = abilityParameters.targets[0];
        game.addAbilityTargetListener(this.target, this.blockingListener);
    }
    this.useAbility = function(game, restString) {
        var split = getWhiteSpaceSeparatedParameters(restString, 1);
        var targets = [];
        targets[0] = game.getPlayerByNickOrThrow(split[0]);
    };
}

module.exports = Blocker;
