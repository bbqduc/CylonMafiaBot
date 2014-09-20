/**
 * Created by johannes on 20/09/14.
 */

var _ = require("lodash");
var FactionWinResolver = function(faction) {
    this.faction = faction;
    this.description = "You win when only members of your faction are left alive.";
};

FactionWinResolver.prototype.resolveWin = function(game) {
    _.forEach(game.players, function(element, index) {
        if(!element.isDead && element.role.faction != this.faction) {
            return false;
        }
    }, this);
    return true;
};

module.exports = FactionWinResolver;
