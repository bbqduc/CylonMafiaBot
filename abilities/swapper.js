/**
 * Created by johannes on 20/09/14.
 */

var utils = require("../utils");
var Swapper = function()
{
    this.commandWord = "swap";
    this.abilityDescription = "Swap any nightly action performed on one of your targets to be used on the other target instead. Usage : !" + this.commandWord + " targetNick1 targetNick2";
    this.target1 = null;
    this.target2 = null;
    this.swappedActors = [];
    this.enabledNight = true;
    this.enabledDay = false;

    this.swappingListener = function(game, abilityParameters) {
        if(_.contains(this.swappedActors, abilityParameters.actor)) { // to avoid endless swapping
            return true;
        }

        _.forEach(abilityParameters.targets, function(target, key) {
            var originalTarget = target;
            if(this.target1 === target) {
                abilityParameters.targets[key] = this.target2;
            }
            else if(this.target2 === target) {
                abilityParameters.targets[key] = this.target1;
            }
            if(originalTarget != abilityParameters.targets[key]) {
                this.swappedActors.push(abilityParameters.actor);
                abilityParameters.actor.sendMessage("Somehow you got lost and ended up using " + abilityParameters.ability.commandWord + " on " + abilityParameters.targets[key].player.nick + " instead of " + originalTarget); // TODO : more interesting messages! Like different stuff for bartender etc
            }
        });
        return true;
    };

    this.abilityCallback = function(game, abilityParameters) {
        this.target1 = abilityParameters.targets[0];
        this.target2 = abilityParameters.targets[1];
        game.addAbilityTargetListener(abilityParameters.targets[0], this.swappingListener);
        game.addAbilityTargetListener(abilityParameters.targets[1], this.swappingListener);
    }

    this.parseCommand = function(game, restString) {
        var split = utils.getWhiteSpaceSeparatedParameters(restString, 2);
        var targets = [];
        targets[0] = game.getPlayerByNickOrThrow(split[0]);
        targets[1] = game.getPlayerByNickOrThrow(split[1]);
        return targets;
    };
};

module.exports = Swapper;
