const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setupStatChannels } = require('../../utils/statChannels');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupstats')
        .setDescription('Create the server stats channels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const existing = db.prepare(`
            SELECT COUNT(*) AS count FROM stat_channels WHERE guildId = ?
        `).get(interaction.guild.id);

        if (existing.count > 0) {
            return interaction.editReply(
                'Stats channels already exist for this server. Use `/refreshstats` to sync them with the current config instead.'
            );
        }

        await setupStatChannels(interaction.guild);
        await interaction.editReply('✅ Stats channels created.');
    },
};