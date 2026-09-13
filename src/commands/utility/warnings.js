const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription("View a user's warning history.")
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to check').setRequired(true)
        ),
    async execute(interaction) {
        const target = interaction.options.getUser('target');

        const warns = db.prepare(`
            SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC
        `).all(interaction.guild.id, target.id);

        if (warns.length === 0) {
            return interaction.reply({
                content: `${target.tag} has no warnings.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`Warnings for ${target.tag}`)
            .setColor(0xffcc00)
            .setDescription(
                warns.map((w, i) =>
                    `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.timestamp / 1000)}:R> (by <@${w.moderatorId}>)`
                ).join('\n')
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};