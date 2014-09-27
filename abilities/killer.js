var utils = require("../utils");
var _ = require("lodash");
var Ability = require("./ability");
var Killer = function(params)
{
    Ability.call(this);
    this.maxKillTimes = params == null || params.maxKillsPerGame == null ? -1 : params.maxKillsPerGame; // infinite if not specified
    this.commandWord = "kill";
    this.message = '';
    this.abilityDescription = "Kill another player during the night. ";
    this.enabledNight = true;
    this.maxTargets = this.minTargets = 1;
    if(this.maxKillTimes != -1) {
       this.abilityDescription += "You can use this ability " + this.maxKillTimes + " times during the game.";
    }
    this.abilityDescription += "Usage : !" + this.commandWord + " targetNick [Optional message to leave behind]";

    this.abilityCallback = function(game, abilityParameters) {
        var message = this.message;
        _.forEach(abilityParameters.targets, function(target, key) {
            if(this.maxKillTimes != 0) {
                target.dead = true;
                target.killMessage = message;
                target.killedBy = abilityParameters.actor;
//                target.sendMessage("You were attacked during the night!");
                --this.maxKillTimes;
            }
        }, this);
    };

    this._validateCommand = function(game, params) {
        if(this.maxKillTimes === 0) {
            throw new Error("Maximum amount of kills already performed!");
        }
        this.message = params.message != null ? params.message : "";
    };
};
Killer.prototype = Object.create(Ability.prototype);
Killer.prototype.constructor = Killer;

module.exports = Killer;
