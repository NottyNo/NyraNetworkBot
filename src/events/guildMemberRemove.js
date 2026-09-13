const { Events } = require('discord.js');
const { updateStatChannels } = require('../utils/statChannels');

module.exports = {
    name: Events.GuildMemberRemove,
    execute(member) {
        updateStatChannels(member.guild);
    },
};