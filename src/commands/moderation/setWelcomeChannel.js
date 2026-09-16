const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcomechannel')
        .setDescription('Set the channel where welcome messages are sent.')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to send welcome messages in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        db.prepare(`
            INSERT INTO guild_settings (guildId, welcomeChannelId)
            VALUES (?, ?)
            ON CONFLICT(guildId) DO UPDATE SET welcomeChannelId = excluded.welcomeChannelId
        `).run(interaction.guild.id, channel.id);

        await interaction.reply({
            content: `✅ Welcome messages will now be sent in ${channel}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};