/**
 * Created by johannes on 20/09/14.
 */

var assert = require("should");
var fs = require("fs");
var _ = require("lodash");
var roles = require("../roles");
var Game = require("../game");

describe('Roles', function() {
    var names = [];
    _.forOwn(roles, function (role, name) {
        var obj = new role();
        describe(name, function() {
            describe('name', function () {
                it('should have the name property', function () {
                    obj.should.have.property("NAME");
                    obj.NAME.should.be.type("string");
                });
                it('name property should be unique', function () {
                    names.should.not.containEql(obj.NAME);
                    names.push(obj.NAME);
                });
            });
            describe('getInitialMessage', function () {
                it('should have the getInitialMessage method', function () {
                    obj.should.have.property("getInitialMessage");
                    obj.getInitialMessage.should.be.type("function");
                });
                it('getInitialMessage should return a string', function () {
                    var game = new Game();
                    obj.getInitialMessage(game).should.be.type("string");
                });
            });
            describe('commandWords', function () {
                it('should have the commandWords property', function () {
                    obj.should.have.property("commandWords");
                });
                it('commandWords should be an array of strings', function () {
                    obj.commandWords.should.be.an.instanceOf(Array);
                    _.forEach(obj.commandWords, function(element, index) {
                        element.should.be.of.type("string");
                    });
                });
            });
        });
    });
});
