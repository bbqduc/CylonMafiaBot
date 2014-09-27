/**
 *
 * Created by johannes on 21/09/14.
 */

var utils = require("../utils");
var Ability = require("./ability");
var Protector = function()
{
    Ability.call(this);
    this.commandWord = "protect";
    this.abilityDescription = "Protect another player against death during the night. Usage: !" + this.commandWord + " targetNick";
    this.target = null;
    this.enabledNight = true;
    this.minTargets = this.maxTargets = 1;
    this.abilityCallback = function(game, abilityParameters) {
        var target = abilityParameters.targets[0];
        if(target.dead) {
            target.dead = false;
            //target.sendMessage("Someone saved you from death!");
            //target.killedBy.sendMessage("Someone saved your target!");
            //abilityParameters.actor.sendMessage("You saved your target from certain death!");
        }
    };
    this._validateCommand = function(game, params) {
        if(params.actor === params.targets[0]) {
            throw new Error("Can't protect yourself!");
        }
    };
};

Protector.prototype = Object.create(Ability.prototype);
Protector.prototype.constructor = Protector;
module.exports = Protector;
