/**
 * Created by johannes on 20/09/14.
 */

var Role = require("./role");
var FactionWinResolver = require("../winresolvers/factionwinresolver");
var Killer = require("../abilities/killer");

var CylonLeader = function() {
    this.abilities = [new Killer()];
    Role.call(this);
};
CylonLeader.prototype = Object.create(Role.prototype);
CylonLeader.prototype.constructor = CylonLeader;
CylonLeader.prototype.NAME = "Cylon Leader";
CylonLeader.prototype.FACTION = "Cylon";
CylonLeader.prototype.winResolver = new FactionWinResolver(CylonLeader.prototype.FACTION);

module.exports = CylonLeader;
