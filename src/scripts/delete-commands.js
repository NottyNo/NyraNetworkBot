// Usage:
//   node src/scripts/delete-commands.js guild <commandId>
//   node src/scripts/delete-commands.js global <commandId>
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('../config/config.json');

const [scope, commandId] = process.argv.slice(2);

if (!['guild', 'global'].includes(scope) || !commandId) {
    console.error('Usage: node src/scripts/delete-commands.js <guild|global> <commandId>');
    process.exit(1);
}

const rest = new REST().setToken(token);

const route =
    scope === 'guild'
        ? Routes.applicationGuildCommand(clientId, guildId, commandId)
        : Routes.applicationCommand(clientId, commandId);

rest
    .delete(route)
    .then(() => console.log(`Successfully deleted ${scope} command ${commandId}`))
    .catch(console.error);
