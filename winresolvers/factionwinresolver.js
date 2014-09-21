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
FactionWinResolver.prototype.getInitialMessage = function(role, game) {
    var ret = "You are part of the " + role.FACTION + " faction. You will win when only members of your faction are left alive.";
    if(role.FACTION === "Cylon") { // todo : make this a proper parameter of the winresolver
       var friends = _.pluck(game.getPlayersFromFaction(role.FACTION), "nick");
        ret += "\nThe " + role.FACTION + " players in this game are " + friends.join(',') + ".";
    }
    return ret;
};

module.exports = FactionWinResolver;
