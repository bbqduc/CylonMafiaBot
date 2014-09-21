/**
 *
 * Created by johannes on 20/09/14.
 */

var assert = require("should");
var fs = require("fs");
var _ = require("lodash");
var abilities = require("../abilities");

describe('Abilities', function() {
    var commandWords = [];
    _.forOwn(abilities, function (ability, name) {
        var obj = new ability();
        describe(name, function () {
            describe('CommandWord', function () {
                it('should have the commandWord property', function () {
                    obj.should.have.property("commandWord");
                });
                it('commandWord should have no whitespace', function () {
                    (obj.commandWord.match(/\s/) === null).should.be.true;
                });
                it('commandWord should be unique', function () {
                    commandWords.should.not.containEql(obj.commandWord);
                    commandWords.push(obj.commandWord);
                });
            });
            describe('abilityCallback', function () {
                it('should have the abilityCallback method', function () {
                    obj.should.have.property("abilityCallback");
                    obj.abilityCallback.should.be.type("function");
                });
            });
            describe('parseCommand', function () {
                it('should have the parseCommand method', function () {
                    obj.should.have.property("parseCommand");
                    obj.parseCommand.should.be.type("function");
                });
            });
            describe('abilityDescription', function () {
                it('should have the abilityDescription property', function () {
                    obj.should.have.property("abilityDescription");
                    obj.abilityDescription.should.be.of.type("string");
                });
            });
        });
    });
});

