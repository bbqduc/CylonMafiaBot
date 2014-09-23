var Liar = function(params)
{
    this.abilityDescription = "Your votes are counted as the opposite of what you say.";
    this.enabledNight = false;
    this.enabledDay = false;

	 this.voteCallback = function(showYesVote, params) {
		 var tmp = params.yesEffect;
		 params.yesEffect = params.noEffect;
		 params.noEffect = tmp;
	 }
};

module.exports = Liar;
