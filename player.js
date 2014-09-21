var Player = function(nick, game) {
    this.nick = nick;
    this.dead = false;
    this.game = game;
    this.killedBy = null;
    this.killMessage = null;
};

Player.prototype.sendMessage = function(message) {
    game.sendPrivateMessage(this.nick, message);
};

Player.prototype.useAbility = function(ability, targets) {
    game.useAbility(ability, this, targets);
};

module.exports = Player;
