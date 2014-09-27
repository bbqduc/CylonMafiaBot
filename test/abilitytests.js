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
        if(ability == abilities.ability) return;
        var obj = new ability();
        describe(name, function () {
            describe('CommandWord', function () {
                it('commandWord should have no whitespace', function () {
                    if(obj.commandWord != null) {
                        (obj.commandWord.match(/\s/) === null).should.be.true;
                    }
                });
                it('commandWord should be unique', function () {
                    if(obj.commandWord != null) {
                        commandWords.should.not.containEql(obj.commandWord);
                        commandWords.push(obj.commandWord);
                    }
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

