/**
 *
 * Created by johannes on 21/09/14.
 */

var utils = require("../utils");
var Ability = require("./ability");
var Detective = function()
{
    Ability.call(this);
    this.commandWord = "investigate";
    this.abilityDescription = "Find out something about another player's role. Usage: !" + this.commandWord + " targetNick";
    this.target = null;
    this.enabledNight = true;
    this.minTargets = this.maxTargets = 1;
    this.abilityCallback = function(game, abilityParameters) {
        var target = abilityParameters.targets[0];
        var message;
        switch(target.role.NAME) {
            case "Cylon Number 2":
            case "Tom Zarek":
                message = "seems to own a lot of guns.";
            case "Cylon Politician":
            case "Laura Roslin":
                message = "seems to be some sort of politician.";
            case "Human Blocker":
            case "Cylon Blocker":
                message = "has really wide shoulders. He could completely block a corridor if he wanted.";
            default:
                message = "doesn't raise any suspicions.";
        }
        abilityParameters.actor.sendMessage("Your target " + message);
    };
    this._validateCommand = function(game, params) {
    };
};

Detective.prototype = Object.create(Ability.prototype);
Detective.prototype.constructor = Detective;
module.exports = Detective;
