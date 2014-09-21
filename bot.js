/**
 * Created by johannes on 20/09/14.
 */

var irc = require("irc");
var Game = require("./game");
var _ = require("lodash");

var CylonBot = function(server, botnick, channel, maintainernick, game, callback) {
    this.client = new irc.Client(server, botnick, {channels: [channel]});
    this.channel = channel;
    this.connected = false;
    this.game = game;
    this.game.communicationInterface = this;
    this.maintainer = maintainernick;

    this.client.addListener("error", function(message) {
      //console.log("Error : " + message);
    });

    var tmp = this;

    this.client.addListener("join", function(joinedchannel, nick, message) {
        if(nick == this.nick && joinedchannel == channel) {
            tmp.connected = true;
            game.startServing();
            if(callback != null) callback(this);
            tmp.sendPrivateMessage(maintainernick, "Ready for action!");
        }
    });

    this.client.addListener("message", function(sender, to, text, message) {
        if(to == channel) {
            game.onPublicMessage(sender, text);
        }
        else if(to == botnick) {
            game.onPrivateMessage(sender, text);
        }
    });
};


CylonBot.prototype.sendPublicMessage = function(message) {
    var msgs = message.split('\n');
    _.forEach(msgs, function(msg, index) {
        this.client.say(this.channel, msg);
    }, this);
};

CylonBot.prototype.sendPrivateMessage = function(targetNick, message) {
    var msgs = message.split('\n');
    _.forEach(msgs, function(msg, index) {
        this.client.say(targetNick, msg);
    },this);
};

//var game = new Game();
//var bot = new CylonBot("bduc.org", "CylonMafiaBot", "#asd", "johannes", game);

module.exports = CylonBot;
