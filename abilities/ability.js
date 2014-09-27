/**
 * Created by johannes on 26/09/14.
 */

var _ = require("lodash");
var Ability = function()
{
    this.enabledNight = false;
    this.enabledDay = false;
    this.maxTargets = 0;
    this.minTargets = 0;

    this.abilityCallback = function(game, abilityParameters) {
    };
    this.validateCommand = function(game, command, actor) {
        if(game.isNight && !this.enabledNight) {
            throw new Error("Can't use that ability during the night.");
        } else if(!game.isNight && !this.enabledDay) {
            throw new Error("Can't use that ability during the day.");
        }
        if(command.targets.length < this.minTargets || command.targets.length > this.maxTargets) {
            throw new Error("Incorrect number of targets.");
        }
        var params = _.omit(command, "targets");
        params.targets = [];
        params.actor = actor;
        _.forEach(command.targets, function(name) {
            params.targets.push(game.getAlivePlayerByNickOrThrow(name)); // TDOO : allow targeting dead players for some abilities?
        });
        if(typeof(this._validateCommand) === "function") {
            this._validateCommand(game, params);
        }
        return params.targets;
    };
}


module.exports = Ability;
