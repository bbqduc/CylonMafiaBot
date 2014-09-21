/**
 * Created by johannes on 20/09/14.
 */

var _ = require("lodash");
var FactionWinResolver = function() {
    this.description = "You win when only members of your faction are left alive.";
};

FactionWinResolver.prototype.resolveWin = function(game, role) {
    return game.getAlivePlayersFromFaction(role.FACTION).length == game.getAlivePlayers().length;
};

module.exports = FactionWinResolver;
