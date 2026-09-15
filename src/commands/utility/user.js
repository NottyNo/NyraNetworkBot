const { SlashCommandBuilder, EmbedBuilder, time, TimestampStyles, MessageFlags } = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides information about a user.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to get information about')
                .setRequired(false))
        .addBooleanOption((option) =>
            option
                .setName('ephemeral')
                .setDescription('Whether or not the reply should be ephemeral')),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        const ephemeral = interaction.options.getBoolean('ephemeral') || false;

        const memberEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('User Information')
            .setDescription([
                `Username: ${targetUser.username}`,
                `ID: ${targetUser.id}`,
                `Joined Server at: ${member ? time(member.joinedAt, TimestampStyles.RelativeTime) : 'Unknown'}`,
                `Account Created at: ${time(targetUser.createdAt, TimestampStyles.LongDateTime)}`,
                `Is a Bot: ${targetUser.bot ? 'Yes' : 'No'}`,
            ].join('\n'))
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        return interaction.reply({
            embeds: [memberEmbed],
            flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
    },
};