var utils = require("../utils");
var _ = require("lodash");
var Killer = function(maxkilltimes)
{
    this.maxKillTimes = maxkilltimes == null ? -1 : maxkilltimes; // infinite if not specified
    this.commandWord = "kill";
    this.message = '';
    this.abilityDescription = "Kill another player during the night. ";
    this.enabledNight = true;
    this.enabledDay = false;
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
                target.sendMessage("You were attacked during the night!");
                --this.maxKillTimes;
            }
        });
    };

    this.parseCommand = function(game, restString) { // this needs to be called when the user attempts to use it ... so needs to ENQUEUE the execution!
        if(this.maxKillTimes === 0) {
            throw new Error("Maximum amount of kills already performed!");
        }
        restString = restString.trim();
        var targets = [];
        var splitPoint = restString.search(/\s/); // split on first whitespace, the rest becomes the kill message
        var targetNick = splitPoint === -1 ? restString : restString.substr(0, splitPoint);
        targets.push(game.getPlayerByNickOrThrow(targetNick));
        this.message = restString.substr(splitPoint).trim();
        return targets;
    };
};

module.exports = Killer;
