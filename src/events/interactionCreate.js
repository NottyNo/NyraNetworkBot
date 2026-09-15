const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
			console.log(`Executed command: ${interaction.commandName} by ${interaction.user.tag}`);
        } catch (error) {
            console.error(error);

            const errorPayload = {
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            };

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload);
                } else {
                    await interaction.reply(errorPayload);
                }
            } catch (followUpError) {
                // Interaction token likely expired (3s timeout) before we could respond at all
                console.error('Failed to send error response to interaction:', followUpError);
            }
        }
    },
};