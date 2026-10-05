const {
    SlashCommandBuilder,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const db = require('../../database/db');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

const MAX_WARNINGS_SHOWN = 20;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription("View a user's warning history.")
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to check').setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const target = interaction.options.getUser('target');

        const warns = db
            .prepare(`SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC`)
            .all(interaction.guild.id, target.id);

        if (warns.length === 0) {
            return interaction.reply({
                content: `${target.tag} has no warnings.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // Cap the list so the embed description never exceeds Discord's 4096 character limit
        const shown = warns.slice(0, MAX_WARNINGS_SHOWN);
        let description = shown
            .map(
                (w) =>
                    `**ID: ${w.id}** - ${w.reason} - <t:${Math.floor(w.timestamp / 1000)}:R> (by <@${w.moderatorId}>)`
            )
            .join('\n');

        if (warns.length > shown.length) {
            description += `\n\n...and ${warns.length - shown.length} older warning(s).`;
        }
        if (description.length > 4000) {
            description = `${description.slice(0, 3990)}...`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Warnings for ${target.tag} (${warns.length})`)
            .setColor(embedColor)
            .setDescription(description);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
