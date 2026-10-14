const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, InteractionContextType, MessageFlags } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevelchannel')
        .setDescription('Set the channel for text and voice level-up messages.')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to send level-up messages in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel', true);
        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
            return interaction.reply({
                content: 'I need View Channel and Send Messages permissions in that channel.',
                flags: MessageFlags.Ephemeral,
            });
        }

        db.prepare(`
            INSERT INTO guild_settings (guildId, levelChannelId)
            VALUES (?, ?)
            ON CONFLICT(guildId) DO UPDATE SET levelChannelId = excluded.levelChannelId
        `).run(interaction.guild.id, channel.id);

        await interaction.reply({
            content: `Text and voice level-up messages will now be sent in ${channel}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
