/**
 *
 * Created by johannes on 20/09/14.
 */

require('irc-colors').global()
var _ = require("lodash");
var Player = require("./player");
var Game = function()
{
    this.players = {};
    this.killedPlayers = {};
    this.killedDuringLastNight = [];
    this.currentDay = 0;
    this.cylonRoles = [];
    this.humanRoles = [];

    Game.prototype.startServing = function() {};

    Game.prototype.addPlayer = function(nick, restString) {
        if(restString != "") {
           return false;
        }
        this.players[nick] = new Player(nick);
        this.communicationInterface.sendPublicMessage(nick + " boarded the ship! Currently " + _.size(this.players) + " players on board. To leave the game before it starts, type " + "!leave".irc.bold() + ". For a full list of available commands, type " + "!commands.".irc.bold());
        return true;
    };
    Game.prototype.removePlayer = function(nick)
    {
        delete this.players[nick];
        this.communicationInterface.sendPublicMessage(nick + " confessed to being a cylon! Currently " + _.size(this.mPlayers) + " players on board.");
    };

    Game.prototype.onPublicMessage = function(sender, message) {
        message = message.trim();
        if(message.length > 1 && message[0] == '!') {
           this.handlePublicCommand(this.parseCommand(sender, message.substr(1)));
        }
    };

    Game.prototype.onPrivateMessage = function(sender, message) {
        message = message.trim();
        if(message.length > 1 && message[0] == '!') {
            this.handlePrivateCommand(this.parseCommand(sender, message.substr(1)));
        }
    };

    Game.prototype.parseCommand = function(sender, message) {
        var splitPoint = message.search(/\s/); // split on first whitespace
        var command = splitPoint === -1 ? message : message.substr(0, splitPoint);
        var restString = splitPoint === -1 ? "" : message.substr(splitPoint).trim();
        return {sender: sender, commandWord: command, restString: restString};
    };


    Game.prototype.handlePublicCommand = function(command) {
        if(this.commandHandlers[command["commandWord"]] != null) {
           this.commandHandlers[command["commandWord"]](command["sender"], command["restString"]);
        }
    };

    Game.prototype.handlePrivateCommand = function(command) {
        if(this.commandHandlers[command["commandWord"]] != null) {
            this.commandHandlers[command["commandWord"]](command["sender"], command["restString"]);
        }
    };

    Game.prototype.determineRoles = function()
    {
        var roles = [];
        var i = 0;
        var cylonLeaderPresent = false;
        this.mCylonRoles = _.shuffle(this.mCylonRoles);
        this.mHumanRoles = _.shuffle(this.mHumanRoles);
        var numberOfCylons = 1;//Math.round(_.size(this.mPlayers) / 3.0);
        for(i = 0; i < numberOfCylons; ++i) {
            roles[i] = this.mCylonRoles[i];
            if(roles[i] instanceof CM.C_Role.C_CylonLeader) {
                cylonLeaderPresent = true;
            }
        }
        if(!cylonLeaderPresent) {
            roles[0] = new CM.C_Role.C_CylonLeader();
        }
        for(i = numberOfCylons; i < _.size(this.mPlayers); ++i) {
            roles[i] = this.mHumanRoles[i];
        }

        roles = _.shuffle(roles);
        i = 0;
        _.forOwn(this.mPlayers, function(player)
        {
            player.mSetRole(roles[i++]);
        });
    };

    Game.prototype.startGame = function()
    {
        this.communicationInterface.sendMessage("Game starting!");
        this.determineRoles();
        this.advanceToNextDay();
    };

    Game.prototype.detectNewDeadPeople = function()
    {
        this.mKilledDuringLastNight = [];
        _.forOwn(this.mPlayers, function(player, nick)
        {
            if(player.mRole.mDead && !(_.contains(mKilledPlayers, nick)))
            {
                player.mKilledOnDay = mCurrentDay;
                this.mKilledPlayers[nick] = player;
                this.mKilledDuringLastNight.push(player);
            }
        });
    }
    Game.prototype.advanceToNextDay = function()
    {
        this.detectNewDeadPeople();
        this.sendMessagesForDay(this.currentDay);
        this.currentDay++;
        this.sendChannelMessage("=========== DAY " + this.currentDay + "===========");
    };

    Game.prototype.sendMessagesForDay = function(day)
    {
        _.forEach(this.mKilledDuringLastNight, function(player, index)
        {
            this.communicationInterface.sendPublicMessage(player.mNick + " was brutally murdered during the night!");
            if(player.mKillMessage != "")
                this.communicationInterface.sendPublicMessage("The killer left a message : " + message);
        });
    };

    this.commandHandlers = {
        "join": Game.prototype.addPlayer.bind(this)
    };
};

module.exports = Game;
