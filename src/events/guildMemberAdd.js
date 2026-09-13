const { Events } = require('discord.js');
const { updateStatChannels } = require('../utils/statChannels');

module.exports = {
    name: Events.GuildMemberAdd,
    execute(member) {
        updateStatChannels(member.guild);
    },
};