/**
 * Created by johannes on 22/09/14.
 */

var Ability = require("./ability");

var SuperVoter = function(params)
{
    Ability.call(this);
    this.votingPower = (params == null || params.bonus == null) ? 1 : Number(params.bonus);
    this.abilityDescription = "Your votes have an additional " + this.votingPower + " weight.";
};

SuperVoter.prototype = Object.create(Ability.prototype);
SuperVoter.prototype.constructor = SuperVoter;
module.exports = SuperVoter;
