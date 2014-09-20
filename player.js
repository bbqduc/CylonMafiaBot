var Player = function(nick) {
    this.nick = nick;
};
Player.prototype.setRole = function(role) {
    this.role = role;
    this.role.player = this;
    this.sendMessage(role.getInitialMessage());
};

Player.prototype.sendMessage = function(message)
{
    console.log(this.nick + " received message: " + message);
};

Player.prototype.receiveMessage = function(message)
{
    console.log(this.nick + " received message: " + message);
};

module.exports = Player;
