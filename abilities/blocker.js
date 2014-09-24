/**
 *
 * Created by johannes on 20/09/14.
 */

var utils = require("../utils");
var _ = require("lodash");
var Blocker = function()
{
    this.commandWord = "block";
    this.abilityDescription = "Block another player from performing any actions during the night, unless they are targeted at you. Can't block the same target two nights in a row. Usage : !" + this.commandWord + " targetNick";
    this.target = null;
    this.lastTarget = null;
    this.lastUsedNight = -2;
    this.enabledNight = true;
    this.enabledDay = false;
    this.blockingListener = function(game, abilityParameters)
    {
        if(abilityParameters.actor === this.target && !_.contains(abilityParameters.targets, this.actor)) {
            abilityParameters.actor.sendMessage("Your action was blocked!"); // TODO : more interesting messages! Like different stuff for bartender etc
            return false;
        }
    };
    this.abilityCallback = function(game, abilityParameters) {
        this.target = abilityParameters.targets[0];
		  this.actor = abilityParameters.actor;
        game.addAbilityActorListener(this.target, this.blockingListener.bind(this));
    };
    this.parseCommand = function(game, restString) {
        var split = utils.getWhiteSpaceSeparatedParameters(restString, 1);
        var targets = [];
        targets[0] = game.getAlivePlayerByNickOrThrow(split[0]);
        if(targets[0] === this.lastTarget && game.currentDay - this.lastUsedNight < 2) {
            throw new Error("Can't block the same dude two nights in a row!");
        }
        this.lastUsedNight = game.currentDay;
        this.lastTarget = targets[0];
        return targets;
    };
}

module.exports = Blocker;
