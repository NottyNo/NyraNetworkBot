const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warns a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to warn').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for the warning').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        db.prepare(`
            INSERT INTO warns (guildId, userId, moderatorId, reason, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `).run(interaction.guild.id, target.id, interaction.user.id, reason, Date.now());

        await interaction.reply({
            content: `⚠️ ${target.tag} has been warned. Reason: ${reason}`,
            flags: MessageFlags.Ephemeral,
        });
    },
};