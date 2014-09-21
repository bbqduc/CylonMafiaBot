/**
 *
 * Created by johannes on 20/09/14.
 */

require('irc-colors').global()
var _ = require("lodash");
var Player = require("./player");
var roleClasses = require("./roles");

var DummyCommunicationInterface = function()
{
    this.sendPublicMessage = function(message) {
    };

    this.sendPrivateMessage = function(targetNick, message) {
    };
};

var Game = function()
{
    this.communicationInterface = new DummyCommunicationInterface();
    this.players = {};
    this.killedPlayers = {};
    this.killedDuringLastNight = [];
    this.currentDay = 0;
    this.gameStarted = false;

    Game.prototype.startServing = function() {};

    Game.prototype.getPlayersFromFaction = function(faction) {
        return _.filter(this.players, function(player) {
            return (player.role != null) && player.role.FACTION === faction;
        });
    };

    Game.prototype.getAlivePlayersFromFaction = function(faction) {

        return _.filter(this.getPlayersFromFaction(faction), {'dead': false});
    };

    Game.prototype.getAlivePlayers = function() {
        return _.filter(this.players, {'dead': false});
    };

    Game.prototype.addPlayer = function(nick, restString) {
        if(this.gameStarted) {
            this.communicationInterface.sendPublicMessage("Cannot join an ongoing game!");
            return false;
        }
        if(restString != "") {
           return false;
        }
        this.players[nick] = new Player(nick);
        this.communicationInterface.sendPublicMessage(nick + " boarded the ship! Currently " + _.size(this.players) + " players on board. To leave the game before it starts, type " + "!leave".irc.bold() + ". For a full list of available commands, type " + "!commands.".irc.bold());
        return true;
    };
    Game.prototype.removePlayer = function(nick)
    {
        if(this.gameStarted) {
            this.communicationInterface.sendPublicMessage("Cannot leave an ongoing game!");
            return false;
        }
        delete this.players[nick];
        this.communicationInterface.sendPublicMessage(nick + " confessed to being a cylon! Currently " + _.size(this.players) + " players on board.");
        return true;
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
        var cylonRoles = [];
        var humanRoles = [];

        _.forOwn(roleClasses, function(role, name) {
            if(role == roleClasses.role) {
                return;
            }
            if(role.prototype.FACTION === "Cylon") {
                cylonRoles.push(new role());
            } else {
                humanRoles.push(new role());
            }
        });
        var numberOfCylons = Math.round(_.size(this.players) / 3.0);
        if(cylonRoles.length < numberOfCylons || humanRoles.length < _.size(this.players)-numberOfCylons) {
            throw "Oops, not enough roles for all players!";
        }
        cylonRoles = _.shuffle(cylonRoles);
        humanRoles = _.shuffle(humanRoles);
        var roles = [];
        for(i = 0; i < numberOfCylons; ++i) {
            roles[i] = cylonRoles[i];
        }
        for(i = numberOfCylons; i < _.size(this.players); ++i) {
            roles[i] = humanRoles[i-numberOfCylons];
        }
        roles = _.shuffle(roles);
        i = 0;
        _.forOwn(this.players, function(player)
        {
            roles[i].player = player;
            player.role = roles[i++];
            this.communicationInterface.sendPrivateMessage(player.nick, player.role.getInitialMessage());
        }, this);
    };

    Game.prototype.startGame = function()
    {
        this.gameStarted = true;
        this.communicationInterface.sendPublicMessage("Game starting!");
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
        this.communicationInterface.sendPublicMessage("=========== DAY " + this.currentDay + "===========");
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
        "join": Game.prototype.addPlayer.bind(this),
        "leave": Game.prototype.removePlayer.bind(this)
    };
};

module.exports = Game;
