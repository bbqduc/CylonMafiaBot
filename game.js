/**
 *
 * Created by johannes on 20/09/14.
 */

require('irc-colors').global()
var _ = require("lodash");
var Player = require("./player");
var roleClasses = require("./roles");
var abilities = require("./abilities" );

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

    Game.prototype.reset = function() {
        this.players = {};
        this.killedPlayers = [];
        this.currentDay = 0;
        this.isNight = false;
        this.isStarted = false;
        this.abilityActorListeners = {};
        this.abilityTargetListeners = {};
        this.abilitiesUsed = [];

        this.voteTargetsResolved = [];
        this.voteInProgress = false;
        this.airlockVoteTarget = null;
        this.yesVotes = 0;
        this.noVotes = 0;
        this.votedPlayers = [];
    };

    this.reset();

    // TODO : this doesn't belong here!
    this.abilityOrdering = [
        "blocker",
        "swapper",
        "killer",
        "detective",
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

    Game.prototype.forceEndNight = function(sender) {
        if(sender === "bduc" && this.isNight) {
            this.communicationInterface.sendPublicMessage("Forcing end of night.");
            this.resolveAbilities();
        }
    };

    Game.prototype.abortGame = function(sender) {
        if(sender === "bduc") {
            this.communicationInterface.sendPublicMessage("Resetting.");
            this.reset();
        }
    };
    Game.prototype.printPlayers = function(sender) {
        var nicks = _.pluck(this.getAlivePlayers(), "nick");
        if(nicks.length == 0) {
            this.communicationInterface.sendPrivateMessage(sender, "No players.");
        } else {
            this.communicationInterface.sendPrivateMessage(sender, "Alive players: " + nicks.join(", "));
        }
    };

    Game.prototype.getPlayersFromFaction = function(faction) {
        return _.filter(this.players, function(player) {
            return (player.role != null) && player.role.FACTION === faction;
        });
    };

    Game.prototype.getTotalVotingPower = function() {
        return _(this.getAlivePlayers()).reduce(function(sum, player) {
            return sum + player.role.votingPower;
        });
    };

    Game.prototype.getAlivePlayersFromFaction = function(faction) {
        return _.filter(this.getPlayersFromFaction(faction), {'dead': false});
    };

    Game.prototype.victoryCheck = function() {
        var playersAliveAreAllWinners = true;
        _.forEach(this.getAlivePlayers(), function(player, key) {
            playersAliveAreAllWinners = playersAliveAreAllWinners && player.role.resolveWin(this);
        }, this);
        if(playersAliveAreAllWinners) {
            this.communicationInterface.sendPublicMessage("========= Game Finished =========");
            var winners = [];
            var losers = [];
            _.forOwn(this.players, function(player, nick) {
                if(player.role.resolveWin(this)) {
                    winners.push(player.nick + " (" + player.originalRole.NAME + ")");
                } else {
                    losers.push(player.nick + " (" + player.originalRole.NAME + ")");
                }
            }, this);
            this.communicationInterface.sendPublicMessage("Winners: " + winners.join(", "));
            this.communicationInterface.sendPublicMessage("Not-Winners: " + losers.join(", "));
            this.reset();
            return true;
        }
        return false;
    };

    Game.prototype.getAlivePlayers = function() {
        return _.filter(this.players, {'dead': false});
    };

    Game.prototype.addPlayer = function(nick, restString) {
        if(this.isStarted) {
            this.communicationInterface.sendPublicMessage("Cannot join an ongoing game!");
            return false;
        }
        if(restString != "") {
            return false;
        }
        if(this.players[nick] == null) {
            this.players[nick] = new Player(nick, this);
            this.communicationInterface.sendPublicMessage(nick + " boarded the ship! Currently " + _.size(this.players) + " players on board. To leave the game before it starts, type " + "!leave".irc.bold() + ". For a full list of available commands, type " + "!commands.".irc.bold());
        }
        return true;
    };
    Game.prototype.removePlayer = function(nick)
    {
        if(this.isStarted) {
            this.communicationInterface.sendPublicMessage("Cannot leave an ongoing game!");
            return false;
        }
        if(this.players[nick] != null) {
            delete this.players[nick];
            this.communicationInterface.sendPublicMessage(nick + " confessed to being a cylon! Currently " + _.size(this.players) + " players on board.");
        }
        return true;
    };

    Game.prototype.onPublicMessage = function(sender, message) {
        message = message.trim();
        if(message.length > 1 && message[0] == '!') {
            var args = this.parseCommand(message.substr(1));
            this.handlePublicCommand(sender, args.commandWord, args.restString);
        }
    };

    Game.prototype.onPrivateMessage = function(sender, message) {
        message = message.trim();
        if(message.length > 1 && message[0] == '!') {
            var args = this.parseCommand(message.substr(1));
            this.handlePrivateCommand(sender, args.commandWord, args.restString);
        }
    };

    Game.prototype.parseCommand = function(message) {
        var splitPoint = message.search(/\s/); // split on first whitespace
        var command = splitPoint === -1 ? message : message.substr(0, splitPoint);
        var restString = splitPoint === -1 ? "" : message.substr(splitPoint).trim();
        return {commandWord: command, restString: restString};
    };


    Game.prototype.handlePublicCommand = function(sender, commandWord, restString) {
        try {
            if (this.commandHandlers[commandWord] != null) {
                this.commandHandlers[commandWord].callBack(sender, restString);
            } else if (this.players[sender] != null && !this.players[sender].dead) {
                this.players[sender].onCommand(commandWord, restString);
            }
        } catch(e) {
            this.communicationInterface.sendPublicMessage(e.toString());
        }
    };

    Game.prototype.handlePrivateCommand = function(sender, commandWord, restString) {
        try {
            if (this.commandHandlers[commandWord] != null) {
                this.commandHandlers[commandWord].callBack(sender, restString);
            } else if (this.players[sender] != null && !this.players[sender].dead) {
                this.players[sender].onCommand(commandWord, restString);
            }
        } catch(e) {
            console.log(e);
            this.communicationInterface.sendPrivateMessage(e.toString());
        }
    };

    Game.prototype.determineRoles = function() {
        var cylonRoles = [];
        var humanRoles = [];

        _.forOwn(roleClasses, function (role, name) {
            if (role == roleClasses.role) {
                return;
            }
            if (role.prototype.FACTION === "Cylon") {
                cylonRoles.push(new role());
            } else {
                humanRoles.push(new role());
            }
        });
        var numberOfCylons = Math.floor(_.size(this.players) / 3.0);
        if (cylonRoles.length < numberOfCylons || humanRoles.length < _.size(this.players) - numberOfCylons) {
            throw new Error("Oops, not enough roles for all players!");
        }
        cylonRoles = _.shuffle(cylonRoles);
        humanRoles = _.shuffle(humanRoles);
        var roles = [];
        if (numberOfCylons === 1) { // If only 1 cylon, make sure he can at least kill
            roles[0] = new roleClasses.number2();
        }
        else {
            for (i = 0; i < numberOfCylons; ++i) {
                roles[i] = cylonRoles[i];
            }
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
            player.originalRole = player.role;
        }, this);

        _.forOwn(this.players, function(player) {
            this.communicationInterface.sendPrivateMessage(player.nick, player.role.getInitialMessage(this));
        }, this);
    };

    Game.prototype.startGame = function()
    {
        if(this.isStarted) {
            throw new Error("Game already running.");
        }
        if(_.size(this.players) < 4) {
            throw new Error("Not much point to play with under 4 people!");
        }
        this.isStarted = true;
        this.communicationInterface.sendPublicMessage("Game starting!");
        this.determineRoles();
        this.advanceToNight();
    };

    Game.prototype.detectNewDeadPeople = function()
    {
        _.forOwn(this.players, function(player, nick) {
            if(player.dead && !(_.contains(this.killedPlayers, nick))) {
                this.communicationInterface.sendPublicMessage(nick + "(" + player.originalRole.NAME + ") was brutally murdered during the night!");
                if(player.killMessage != "")
                    this.communicationInterface.sendPublicMessage("The killer left a message : " + player.killMessage);
                this.killedPlayers.push(nick);
            }
        }, this);
    }
    Game.prototype.advanceToNextDay = function()
    {
        this.voteTargetsResolved = [];
        this.detectNewDeadPeople();
        this.lastCylonCheck();
        if(!this.victoryCheck()) {
            this.currentDay++;
            this.isNight = false;
            this.communicationInterface.sendPublicMessage("=========== DAY " + this.currentDay + "===========");
            this.resetAbilities();
            this.triggerNewDayCallbacks();
        }
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

    Game.prototype.isNightDone = function() {
        var allUsed = true;
        _.forEach(this.getAlivePlayers(), function(player, key) {
            allUsed = allUsed && player.role.abilityUsed;
        }, this);
        return allUsed;
    };

    Game.prototype.nextDayIfAllPlayersDone = function() {
        if(this.isNightDone()) {
            this.resolveAbilities();
        }
    };

    Game.prototype.useAbility = function(ability, actor, targets) {
        this.abilitiesUsed.push({ability: ability, actor: actor, targets: targets});
        this.nextDayIfAllPlayersDone();
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

    Game.prototype.registerVote = function(player, showYesVote, yesEffect, noEffect) {
        if(!this.isStarted) {
            throw new Error("Can't vote before the game has started.");
        }
        if(!this.voteInProgress) {
            throw new Error("No vote in progress.");
        }
        if(_.contains(this.votedPlayers, player.nick)) {
            throw new Error("Can't vote more than once.");
        }
        if(showYesVote === true) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "YES".irc.bold.green());
        }
        else if(showYesVote === false) {
            this.communicationInterface.sendPublicMessage(player.nick + " voted " + "NO".irc.bold.red());
        }
        else { throw new Error("Vote " + votedYes + " not recognized."); }
		  this.yesVotes += yesEffect;
		  this.noVotes += noEffect;
        this.votedPlayers.push(player.nick);
        if(this.votedPlayers.length == _.size(this.getAlivePlayers()) || this.yesVotes > (this.getTotalVotingPower() / 2) || this.noVotes >= (this.getTotalVotingPower() / 2)) {
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

    Game.prototype.advanceToNight = function() {
        this.lastCylonCheck();
        this.isNight = true;
        this.communicationInterface.sendPublicMessage("=========== NIGHT " + this.currentDay + "===========");
        this.nextDayIfAllPlayersDone();
    };

    Game.prototype.lastCylonCheck = function() {
        var cylons = this.getAlivePlayersFromFaction("Cylon");
        if(cylons.length === 1 && cylons[0].role.NAME != "Cylon Number 2") {
            cylons[0].role = new roleClasses.number2();
            this.communicationInterface.sendPrivateMessage(cylons[0].nick, "You're the last cylon alive, and you have been granted the power to kill.");
        }
    };

    Game.prototype.resolveVote = function() {
        if(this.yesVotes > this.noVotes) {
            var message = "Motion passes. ";
            if(this.airlockVoteTarget == null) {
                message += "The airlock gets no exercise today.";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " (" + this.airlockVoteTarget.originalRole.NAME + ") is thrown out of the airlock."
                this.airlockVoteTarget.dead = true;
                this.killedPlayers.push(this.airlockVoteTarget.nick);
            }
            this.communicationInterface.sendPublicMessage(message);
            this.resetVote();
            if(!this.victoryCheck()) {
                this.advanceToNight();
            }
        } else {
            var message = "Motion fails. ";
            if(this.airlockVoteTarget == null) {
                message += "The people want justice!";
            } else {
                message += this.airlockVoteTarget.nick.irc.bold() + " stays alive.";
            }
            this.communicationInterface.sendPublicMessage(message);
            this.voteTargetsResolved.push(this.airlockVoteTarget == null ? null : this.airlockVoteTarget.nick);
            if(this.voteTargetsResolved.length >= this.getAlivePlayers().length+1) {
                this.communicationInterface.sendPublicMessage("Admiral Adama says: No more voting for today.");
                this.advanceToNight();
            }
            this.resetVote();
        }
    };

    Game.prototype.callAirlockVote = function(actor, restString) {
        if(!this.isStarted) {
            throw new Error("Can't call a vote before the game has started.");
        }
        if(this.isNight) {
            throw new Error("Can't call a vote at night.");
        }
        if(this.voteInProgress) {
            throw new Error("There is already a vote in progress.");
        }
        var player;
        restString = restString.trim();
        if(_.contains(this.voteTargetsResolved, restString === "" ? null : restString)) {
            throw new Error("That vote has already been attempted today.");
        }
        if(restString === "") {
            player = null; // call a vote to not airlock anyone
            this.communicationInterface.sendPublicMessage(actor.nick + " has called a vote to skip throwing anyone out of the airlock today.");
        } else {
            player = this.getAlivePlayerByNickOrThrow(restString);
            this.communicationInterface.sendPublicMessage(actor.nick + " has called a vote to throw " + restString.irc.bold() + " out of the airlock!");
        }
        this.airlockVoteTarget = player;
        this.voteInProgress = true;
    };

    Game.prototype.getCommandsString = function(sender) {
        var ret = "";
        _.forOwn(this.commandHandlers, function(value, name) {
            ret += "!" + name + " : " + value.description + "\n";
        });
        var player = this.players[sender];
        if(player != null) {
            ret += player.getCommandsString();
        }
        this.communicationInterface.sendPrivateMessage(sender, ret);
    };

    this.commandHandlers = {
        "join": {callBack: Game.prototype.addPlayer.bind(this), description: "Join a game that hasn't yet started."},
        "start": {callBack: Game.prototype.startGame.bind(this), description: "Start a game."},
        "leave": {callBack: Game.prototype.removePlayer.bind(this), description: "Leave a game that hasn't yet started."},
        "players": {callBack: Game.prototype.printPlayers.bind(this), description: "Get a list of alive players."},
        "commands": {callBack: Game.prototype.getCommandsString.bind(this), description: "Get a list of available commands."},
        "endnight": {callBack: Game.prototype.forceEndNight.bind(this), description: "Force end of night. (only works if you're the admin)"},
        "abort": {callBack: Game.prototype.abortGame.bind(this), description: "Abort the current game. (only works if you're the admin)"}
    };

};

module.exports = Game;
