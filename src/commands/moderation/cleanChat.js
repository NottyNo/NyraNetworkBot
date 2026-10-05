const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleanchat')
        .setDescription('Clears the chat in the current channel.')
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('The number of messages to delete (1-100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        try {
            // true = skip messages older than 14 days, which Discord cannot bulk delete
            const deleted = await interaction.channel.bulkDelete(amount, true);

            await interaction.reply({
                embeds: [
                    {
                        color: embedColor,
                        title: 'Chat Cleared',
                        description: `Successfully deleted \`${deleted.size}\` messages.`,
                    },
                ],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error trying to delete messages in this channel!',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
