/**
 * Created by johannes on 20/09/14.
 */

var irc = require("irc");
var Game = require("./game");
var _ = require("lodash");
var argv = require("yargs").argv;

var CylonBot = function(server, botnick, channel, maintainernick, callback) {
    this.finishedCallback = function(game) {
        this.game = new Game(this.finishedCallback.bind(this));
        this.game.communicationInterface = this;
    }
    this.client = new irc.Client(server, botnick, {channels: [channel], floodProtection: false, floodProtectionDelay: 500});
    this.channel = channel;
    this.connected = false;
    this.game = new Game(this.finishedCallback.bind(this));
    this.game.communicationInterface = this;
    this.maintainer = maintainernick;

    this.client.addListener("error", function(message) {
        //console.log("Error : " + message);
    });

    var self = this;

    this.client.addListener("join", function(joinedchannel, nick, message) {
        if(nick == this.nick && joinedchannel == channel) {
            self.connected = true;
            self.game.startServing();
            if(callback != null) callback(this);
            self.sendPrivateMessage(maintainernick, "Ready for action!");
        }
    });

    if(!argv.test) {
        this.client.addListener("message", function(sender, to, text, message) {
            if(to == channel) {
                self.onPublicMessage(sender, text);
            }
            else if(to == botnick) {
                self.onPrivateMessage(sender, text);
            }
        });
    } else {
        this.client.addListener("message", function(sender, to, text, message) {
            var splitPoint = text.search(/\s/); // split on first whitespace
            var nick = splitPoint === -1 ? text : text.substr(0, splitPoint);
            var restString = splitPoint === -1 ? "" : text.substr(splitPoint).trim();
            console.log("received message " + nick + " : " + restString);
            if(to == channel) {
                self.onPublicMessage(nick, restString);
            }
            else if(to == botnick) {
                self.onPrivateMessage(nick, restString);
            }
        });
    }

    this.parseCommand = function(message) {
        var splitPoint = message.search(/\s/); // split on first whitespace
        var commandWord = (splitPoint === -1 ? message : message.substr(0, splitPoint)).toLowerCase();
        var restString = splitPoint === -1 ? "" : message.substr(splitPoint);
        var obj = {};
        switch(commandWord) {
            case "kill":
                obj = this.parseKill(restString);
                break;
            case "vote":
                obj = this.parseVote(restString);
                break;
            case "y":
                obj = this.parseVote("YES");
                commandWord = "vote";
                break;
            case "n":
                obj = this.parseVote("NO");
                commandWord = "vote";
                break;
            case "airlock":
                obj = this.parseAirlock(restString);
                break;
            case "pass":
                break;
            default:
                obj = this.parseTargets(restString);
        }
        obj.id = commandWord;

        return obj;
    };

    this.onPublicMessage = function(sender, message) {
        message = message.trim();
        var wasCommand = false;
        if (message.length > 1 && message[0] == '!') { // looks like a command
            try {
                wasCommand = this.game.onCommand(sender, this.parseCommand(message.substr(1)));
            }
            catch(e) {
                console.log(e);
                this.sendPublicMessage(e.message);
                //this.game.onMessage(sender, {text: message, to: "public"}); // should somehow consider also messages starting with !
            }
        }
        if(!wasCommand) {
            this.game.onMessage(sender, {text: message, to: "public"});
        }
    };

    this.onPrivateMessage = function(sender, message) {
        message = message.trim();
        if(message.length > 1 && message[0] == '!') {
            try {
                this.game.onCommand(sender, this.parseCommand(message.substr(1)));
            }
            catch(e) {
                console.log(e);
            }
        }
    };

    this.parseVote = function(message) {
        var votedYes;
        var cmp = message.trim().toUpperCase();
        if(cmp == "YES" || cmp == "Y") {
            votedYes = true;
        } else if(cmp == "NO" || cmp == "N") {
            votedYes = false;
        } else {
            throw new Error("Unrecognized vote.")
        }
        return {votedYes: votedYes};
    };

    this.parseAirlock = function(message) {
        var targets = message.trim().split(/\s/);

        if(targets.length > 0)
            return {target: targets[0]};
        else
            return {};
    };

    this.parseTargets = function(message) {
        var targets = message.trim().split(/\s/);

        return {targets: targets};
    };

    this.parseKill = function(message) {
        message = message.trim();
        var splitPoint = message.search(/\s/); // split on first whitespace, the rest becomes the kill message
        var targetNick = splitPoint === -1 ? message : message.substr(0, splitPoint);
        targets = [targetNick];
        message = splitPoint === -1 ? "" : message.substr(splitPoint).trim();

        return {targets: targets, message: message};
    };

};


CylonBot.prototype.sendPublicMessage = function(message) {
    if(message == undefined) return;
    var msgs = message.split('\n');
    _.forEach(msgs, function(msg, index) {
        this.client.say(this.channel, msg);
    }, this);
};

if(argv.test) {
    CylonBot.prototype.sendPrivateMessage = function(targetNick, message) {
        this.client.say(this.channel, "PRIVATE MESSAGE TO : " + targetNick);
        var msgs = message.split('\n');
        _.forEach(msgs, function(msg, index) {
            this.client.say(this.channel, msg);
        },this);
    };
} else {
    CylonBot.prototype.sendPrivateMessage = function(targetNick, message) {
        if(message == undefined) return;
        var msgs = message.split('\n');
        _.forEach(msgs, function(msg, index) {
            this.client.say(targetNick, msg);
        },this);
    };
}

if(argv.test) {
    console.log("TEST MODE");
}

var channel = argv.channel != null ? argv.channel : "#tapiiri-cylon";
var bot = new CylonBot(argv._[0], "CylonMafiaBot", channel, "bduc");

module.exports = CylonBot;
