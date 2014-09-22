/**
 * Created by johannes on 20/09/14.
 */

var irc = require("irc");
var Game = require("./game");
var _ = require("lodash");
var argv = require("optimist").argv;

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

	 if(!argv.test) {
		 this.client.addListener("message", function(sender, to, text, message) {
			  if(to == channel) {
					game.onPublicMessage(sender, text);
			  }
			  else if(to == botnick) {
					game.onPrivateMessage(sender, text);
			  }
		 });
	 } else {
		 this.client.addListener("message", function(sender, to, text, message) {
        var splitPoint = text.search(/\s/); // split on first whitespace
        var nick = splitPoint === -1 ? text : text.substr(0, splitPoint);
        var restString = splitPoint === -1 ? "" : text.substr(splitPoint).trim();
		  console.log("received message " + nick + " : " + restString);
		  if(to == channel) {
				game.onPublicMessage(nick, restString);
		  }
		  else if(to == botnick) {
				game.onPrivateMessage(nick, restString);
		  }
	 });
	 }
};


CylonBot.prototype.sendPublicMessage = function(message) {
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
		if(!message) return;
		 var msgs = message.split('\n');
		 _.forEach(msgs, function(msg, index) {
			  this.client.say(targetNick, msg);
		 },this);
	};
}

if(argv.test) {
	console.log("TEST MODE");
}

var game = new Game();
var bot = new CylonBot(argv._[0], "CylonMafiaBot", "#tapiiri", "bduc", game);

module.exports = CylonBot;
