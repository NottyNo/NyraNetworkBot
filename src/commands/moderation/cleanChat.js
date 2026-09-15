const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleanchat')
        .setDescription('Clears the chat in the current channel.')
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('The number of messages to delete.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const replyEmbed = {
            color: embedColor,
            title: 'Chat Cleared',
            description: `Successfully deleted \`${amount}\` messages.`,
        };
        if (amount < 1 || amount > 100) {
            return interaction.reply({ 
                content: 'You can only delete between 1 and 100 messages.', 
                flags: MessageFlags.Ephemeral 
            });
        } else if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ 
                content: 'You do not have permission to manage messages in this channel.', 
                flags: MessageFlags.Ephemeral 
            });
        } else {
            try {
                await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ 
                    embeds: [replyEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: 'There was an error trying to delete messages in this channel!', 
                    flags: MessageFlags.Ephemeral });
            }
        }
    }
}