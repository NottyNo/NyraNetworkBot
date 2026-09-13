const { Events } = require('discord.js');
const { setupStatChannels } = require('../utils/statChannels');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        await setupStatChannels(guild).catch(console.error);
    },
};