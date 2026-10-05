const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to ping in the server info message.')
                .setRequired(false)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target') ?? interaction.user;

        const serverInfoEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('Server Information')
            .setDescription('IP: play.nyra.network');

        await interaction.reply({
            content: `${targetUser}`,
            embeds: [serverInfoEmbed],
        });
    },
};
