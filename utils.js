/**
 * Created by johannes on 21/09/14.
 */

module.exports = {
    getWhiteSpaceSeparatedParameters:  function (string, expectedLength) {
        var split = string.match(/\S+/g);
        if (expectedLength != null && split.length != expectedLength) {
            throw new Error("Too many parameters provided! Expected " + expectedLength + ", got " + split.length);
        }
        return split;
    },
    addManyPlayers: function(game, numPlayers, namePrefix) {
        for (var i = 0; i < numPlayers; ++i) {
            game.addPlayer(namePrefix + i);
        }
    }
};
