/**
 * Created by johannes on 21/09/14.
 */

module.exports = {
    getWhiteSpaceSeparatedParameters:  function (string, expectedLength) {
        var split = string.match(/\S+/g);
        if (expectedLength != null && split.length != expectedLength) {
            throw "Too many parameters provided! Expected " + expectedLength + ", got " + split.length;
        }
        return split;
    }
};
