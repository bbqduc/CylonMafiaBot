/**
 * Created by johannes on 22/09/14.
 */

var SuperVoter = function(params)
{
    this.votingPower = (params == null || params.bonus == null) ? 1 : Number(params.bonus);
    this.abilityDescription = "Your votes have an additional " + this.votingPower + " weight.";
    this.enabledNight = false;
    this.enabledDay = false;
};

module.exports = SuperVoter;
