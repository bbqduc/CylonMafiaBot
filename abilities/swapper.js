/**
 * Created by johannes on 20/09/14.
 */

var utils = require("../utils");
var _ = require("lodash");
var Ability = require("./ability");
var Swapper = function()
{
    Ability.call(this);
    this.commandWord = "swap";
    this.abilityDescription = "Swap any nightly action performed on one of your targets to be used on the other target instead. Usage : !" + this.commandWord + " targetNick1 targetNick2";
    this.target1 = null;
    this.target2 = null;
    this.swappedActors = [];
    this.enabledNight = true;
    this.maxTargets = this.minTargets = 2;

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
                //abilityParameters.actor.sendMessage("Somehow you got lost and ended up using " + abilityParameters.ability.commandWord + " on " + abilityParameters.targets[key].nick + " instead of " + originalTarget.nick); // TODO : more interesting messages! Like different stuff for bartender etc
            }
        }, this);
        return true;
    };

    this.abilityCallback = function(game, abilityParameters) {
        this.target1 = abilityParameters.targets[0];
        this.target2 = abilityParameters.targets[1];
        game.addAbilityTargetListener(abilityParameters.targets[0], this.swappingListener.bind(this));
        game.addAbilityTargetListener(abilityParameters.targets[1], this.swappingListener.bind(this));
    }

    this._validateCommand = function(game, params) {
    };
};

Swapper.prototype = Object.create(Ability.prototype);
Swapper.prototype.constructor = Swapper;
module.exports = Swapper;
