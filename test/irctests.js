/**
 * Created by johannes on 20/09/14.
 */

process.env.NODE_ENV = 'test';
var assert = require("should");
var _ = require("lodash");
var ircd = require("ircdjs");
var CylonBot = require("../bot");
var Game = require("../game");
var irc = require("irc");

var testClient;
var game = new Game();
var bot;
var server;
var gotPm = false;

describe.skip('IRC', function() {
    before(function(done) {
        server = new ircd.Server();
        server.config = { "network":  "ircn",
            "hostname": "localhost",
            "serverDescription": "A Node IRC daemon",
            "serverName": "server1",
            "port": 6667,
            "linkPort": 7777,
            "motd": "Message of the day",
            "whoWasLimit": 10000,
            "token": 1,
            "opers": {
            },
            "channels": {
            },
            "links": {
                "server2": { "host": "127.0.0.1",
                    "password": "$2a$10$T1UJYlinVUGHqfInKSZQz./CHrYIVVqbDO3N1fRNEUvFvSEcshNdC",
                    "port": 7778,
                    "token": 2 }
            },
            "pingTimeout": 120,
            "maxNickLength": 30
        };
        server.start(function() {
            done();
        });
    });

    describe("connecting", function() {
        it("clients should be able to connect to local server, maintainer should receive PM on connect", function (done) {
            this.timeout(1000);
            testClient = new irc.Client("localhost", "johannes", {channels: ["#asd"]});
            testClient.addListener("pm", function(nick, text, message) {
                if(nick == "CylonMafiaBot") {
                    done();
                }
            });
            testClient.addListener("registered",function () {
                bot = new CylonBot("localhost", "CylonMafiaBot", "#asd", "johannes", game, function() {
                    bot.connected.should.be.true;
                });
            });
        });
        it("game channel should exist", function () {
            server.channels.find("#asd").name.should.equal("#asd");
        });
        it("bot should be in game channel", function () {
            server.channels.find("#asd").findUserNamed("CylonMafiaBot").should.be.ok;
        });
    });
});

