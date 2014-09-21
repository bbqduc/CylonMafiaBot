/**
 *
 * Created by johannes on 20/09/14.
 */

require('irc-colors').global()
var _ = require("lodash");
var Player = require("./player");
var roleClasses = require("./roles");
var abilities = require("./abilities");

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
    this.killedPlayers = [];
    this.killedDuringLastNight = [];
    this.currentDay = 0;
    this.isNight = false;
    this.gameStarted = false;
    this.abilityActorListeners = {};
    this.abilityTargetListeners = {};
    this.abilitiesUsed = [];

    this.voteInProgress = false;
    this.airlockVoteTarget = null;
    this.yesVotes = 0;
    this.noVotes = 0;
    this.votedPlayers = [];

    // TODO : this doesn't belong here!
    this.abilityOrdering = [
        "blocker",
        "swapper",
        "killer",
        "protector"
    ];

    _.forOwn(abilities, function(role, name) {
        if(name != "role" && !_.contains(this.abilityOrdering, name)) {
            this.abilityOrdering.push(name);
        }
    }, this);

    _.forEach(this.abilityOrdering, function(name, index) {
        abilities[name].prototype.RESOLVEORDER = index;
    });

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
        this.players[nick] = new Player(nick, this);
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
            throw new Error("Oops, not enough roles for all players!");
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
        _.forOwn(this.players, function(player, nick) {
            if(player.dead && !(_.contains(this.killedPlayers, nick))) {
                this.communicationInterface.sendPublicMessage(nick + " was brutally murdered during the night!");
                if(player.killMessage != "")
                    this.communicationInterface.sendPublicMessage("The killer left a message : " + player.killMessage);
            }
        }, this);
    }
    Game.prototype.advanceToNextDay = function()
    {
        this.detectNewDeadPeople();
        this.currentDay++;
        this.isNight = false;
        this.communicationInterface.sendPublicMessage("=========== DAY " + this.currentDay + "===========");
        this.resetAbilities();
        this.triggerNewDayCallbacks();
    };

    Game.prototype.triggerNewDayCallbacks = function() {
        _.forEach(this.getAlivePlayers(), function(player, index) {
            player.newDayCallback();
        });
    };

    Game.prototype.getAlivePlayerByNickOrThrow = function(nick) {
        if(this.players[nick] == null || this.players[nick].dead) {
            throw new Error("No living player named " + nick + " in the game.");
        };
        return this.players[nick];
    };

    Game.prototype.getPlayerByNickOrThrow = function(nick) {
        if(this.players[nick] == null) {
            throw new Error("No player named " + nick + " in the game.");
        };
        return this.players[nick];
    };

    Game.prototype.useAbility = function(ability, actor, targets) {
        this.abilitiesUsed.push({ability: ability, actor: actor, targets: targets});
    };

    Game.prototype.resolveAbilities = function() {
        this.abilitiesUsed = _.sortBy(this.abilitiesUsed, function(entry) { return entry.ability.RESOLVEORDER });
        _.forEach(this.abilitiesUsed, function(abilityParameters) {
            var notBlocked = this.launchListeners(abilityParameters);
            if(notBlocked) {
                abilityParameters.ability.abilityCallback(this, abilityParameters);
            }
        }, this);
        this.advanceToNextDay();
    };
    Game.prototype.resetAbilities = function() {
        this.abilitiesUsed = [];
        this.abilityActorListeners = {};
        this.abilityTargetListeners = {};
        _.forEach(this.getAlivePlayers(), function (player, index) {
            this.abilityActorListeners[player.nick] = [];
            this.abilityTargetListeners[player.nick] = [];
        }, this);
    };

    Game.prototype.launchListeners = function(abilityParameters)
    {
        var notBlocked = true;
        _.forEach(this.abilityActorListeners[abilityParameters.actor.nick], function(listener, key) {
            notBlocked = notBlocked && (listener(this, abilityParameters) !== false);
        });
        _.forEach(abilityParameters.targets, function(target, index) {
            _.forEach(this.abilityTargetListeners[target.nick], function (listener, key) {
                notBlocked = notBlocked && (listener(this, abilityParameters) !== false);
            });
        }, this);
        return notBlocked;
    }

    Game.prototype.addAbilityActorListener = function(target, listener) {
        this.abilityActorListeners[target.nick].push(listener);
    };

    Game.prototype.addAbilityTargetListener = function(target, listener) {
        this.abilityTargetListeners[target.nick].push(listener);
    };

    Game.prototype.registerVote = function(player, votedYes) {
        if(!this.gameStarted) {
            throw new Error("Can't vote before the game has started.");
        }
        if(!this.voteInProgress) {
            throw new Error("No vote in progress.");
        }
        if(_.contains(this.votedPlayers, player.nick)) {
            throw new Error("Can't vote more than once.");
        }
        if(votedYes === true) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "YES".irc.bold.green());
            this.yesVotes++;
        }
        else if(votedYes === false) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "NO".irc.bold.red());
            this.noVotes++;
        }
        else { throw new Error("Vote " + votedYes + " not recognized."); }
        this.votedPlayers.push(player.nick);
        if(this.votedPlayers.length == this.getAlivePlayers().length) {
            this.resolveVote();
        }
    };

    Game.prototype.resetVote = function() {
        this.airlockVoteTarget = null;
        this.voteInProgress = false;
        this.yesVotes = 0;
        this.noVotes = 0;
        this.votedPlayers = [];
    };

    Game.prototype.resolveVote = function() {
        if(this.yesVotes > this.noVotes) {
            var message = "Motion passes. ";
            if(this.airlockVoteTarget == null) {
                message += "The airlock gets no exercise today.";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " is thrown out of the airlock."
                this.airlockVoteTarget.dead = true;
                this.killedPlayers.push(this.airlockVoteTarget.nick);
            }
            this.communicationInterface.sendPublicMessage(message);
            this.resetVote();
            this.isNight = true;
        } else {
            var message = "Motion fails. ";
            if(this.airlockVoteTarget == null) {
                message += "The people want justice!";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " stays alive.";
            }
            this.communicationInterface.sendPublicMessage(message);
            this.resetVote();
        }
    };

    Game.prototype.callAirlockVote = function(actor, restString) {
        if(this.isNight) {
            throw new Error("Can't call a vote at night.");
        }
        if(!this.gameStarted) {
            throw new Error("Can't call a vote before the game has started.");
        }
        if(this.airlockVoteTarget != null) {
            throw new Error("There is already an airlock vote in progress for " + this.airlockVoteTarget.nick);
        }
        var player;
        restString = restString.trim();
        if(restString === "") {
            player = null; // call a vote to not airlock anyone
            this.communicationInterface.sendPublicMessage(actor + " has called a vote to skip throwing anyone out of the airlock today.");
        } else {
            player = this.getAlivePlayerByNickOrThrow(restString);
            this.communicationInterface.sendPublicMessage(actor + " has called a vote to throw " + restString.irc.bold() + " out of the airlock!");
        }
        this.airlockVoteTarget = player;
        this.voteInProgress = true;
    };

    this.commandHandlers = {
        "join": Game.prototype.addPlayer.bind(this),
        "leave": Game.prototype.removePlayer.bind(this)
    };
};

module.exports = Game;
