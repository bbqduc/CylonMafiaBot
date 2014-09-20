var _ =	require('lodash');
"use strict";
console.log("Hello world!");

var CM = CM || {};

CM.C_Game = function(server, channel, maintainer)
{
	this.mServer = server;
	this.mChannel = channel;
	this.mPlayers = {};
    this.mKilledPlayers = {};
    this.mKilledDuringLastNight = [];
	this.mMaintainer = maintainer;
    this.mCurrentDay = 0;
    this.mCylonRoles = [new CM.C_Role.C_CylonLeader()];
    this.mHumanRoles = [];

    CM.C_Game.prototype.mAddPlayer = function(nick)
    {
        this.mPlayers[nick] = new Player(nick);
        this.mSendChannelMessage(nick + " boarded the ship! Currently " + _.size(this.mPlayers) + " players on board. To leave the game before it starts, type !leave. For a full list of available commands, type !commands.");
    };
    CM.C_Game.prototype.mRemovePlayer = function(nick)
    {
        delete this.mPlayers[nick];
        this.mSendChannelMessage(nick + " confessed to being a cylon! Currently " + _.size(this.mPlayers) + " players on board.");
    };

    CM.C_Game.prototype.mSendChannelMessage = function(message)
    {
        console.log("CHANNEL MESSAGE : " + message);
    };

    CM.C_Game.prototype.mDetermineRoles = function()
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

    CM.C_Game.prototype.mStartGame = function()
    {
        this.mSendChannelMessage("Game starting!");
        this.mDetermineRoles();
        this.mAdvanceToNextDay();
    };

    CM.C_Game.prototype.mDetectNewDeadPeople = function()
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
    CM.C_Game.prototype.mAdvanceToNextDay = function()
    {
        this.mDetectNewDeadPeople();
        this.mSendMessagesForDay(this.mCurrentDay);
        this.mCurrentDay++;
        this.mSendChannelMessage("=========== DAY " + this.mCurrentDay + "===========");
    };

    CM.C_Game.prototype.mSendMessagesForDay = function(day)
    {
        _.forEach(this.mKilledDuringLastNight, function(player, index)
                {
                    this.mSendChannelMessage(player.mNick + " was brutally murdered during the night!");
                    if(player.mKillMessage != "")
                        this.mSendChannelMessage("The killer left a message : " + message);
                });
    };
};

/*CM.C_Role = function()
{
	this.mAbilities = [];
    this.mKillMessage = "";
    this.mDead = false;
    this.mFaction = null;

    CM.C_Role.prototype.mResolveWin = function(game)
    {
        return false; // nobody wins! MUAHAHA
    }
    CM.C_Role.prototype.mGetInitialMessage = function()
    {
        return "You have received a role!";
    }
};

CM.C_Role.C_CylonLeader = function()
{
    CM.C_Role.call(this);
};
CM.C_Role.C_CylonLeader.prototype = Object.create(CM.C_Role.prototype);
CM.C_Role.C_CylonLeader.prototype.constructor = CM.C_Role.C_CylonLeader;

*/


var game = new CM.C_Game();

game.mAddPlayer("bduc");
game.mRemovePlayer("bduc");
game.mAddPlayer("bduc");
game.mStartGame();

/*
 *
 * CHARACTER (sendmessage)
 * ROLE
 * WIN CONDITION
 * PASSIVE_ABILITIES
 * ACTIVE_ABILITIES
 *
 * CHARACTER ACTIONS
 *		voting
 *		dying
 *		
 *		target of active ability
 *		target of passive ability
 *
 *	OTHER METHODS
 *		game ending -> win / lose
 *
 *
 * eventlistener functions:
 *		abilityUsed(actor, target, ability) // for ability
 *		voteCast(actor, vote)
 *
 *	unit tests + travis ci ?
 */


var getWhiteSpaceSeparatedParameters = function(string, expectedLength) {
    var split = string.match(/\S+/g);
    if(expectedLength != null && split.length != expectedLength) {
        throw "Too many parameters provided! Expected " + expectedLength + ", got " + split.length;
    }
    return split;
}


var g = function(actor, target, ability) {
    var abilityUsed = {actor: actor, target: target, ability: ability};
    this.abilitiesUsed.push(abilityUsed);
}

var resolveAbilities = function()
{
    var abilityPriorities = this.abilityPriorities;
    this.abilitiesUsed = _.sortBy(this.abilitiesUsed, function(abilityUsed) { return abilityPriorities[abilityUsed.commandWord]; });
    _.forEach(this.abilitiesUsed, function(abilityParameters) {
        var notBlocked = this.launchListeners(abilityParameters);
        if(notBlocked) {
            abilityParameters.abilityCallback(this);
        }

    });
    this.abilitiesUsed = [];
}

var runListeners = function(abilityParameters)
{
    _.forEach(this.actorAbilityListeners[abilityParameters.actor], function(listener, key) {
        listener(abilityParameters);
    });
    _.forEach(this.actorAbilityListeners[abilityParameters.target], function(listener, key) {
        listener(abilityParameters);
    });
}
