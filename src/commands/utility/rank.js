const {
    SlashCommandBuilder,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const db = require('../../database/db');
const { xpForLevel, totalXpForLevel } = require('../../utils/xp');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription("Check your or another user's level and XP.")
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to check').setRequired(false)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const target = interaction.options.getUser('target') ?? interaction.user;

        const row = db
            .prepare(`SELECT * FROM levels WHERE guildId = ? AND userId = ?`)
            .get(interaction.guild.id, target.id);

        if (!row) {
            return interaction.reply({
                content: `${target.tag} has not earned any XP yet.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // XP progress inside the current level
        const needed = xpForLevel(row.level);
        const progress = row.xp - totalXpForLevel(row.level);

        const embed = new EmbedBuilder()
            .setTitle(`${target.username}'s Rank`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(embedColor)
            .addFields(
                { name: 'Level', value: `${row.level}`, inline: true },
                { name: 'Progress', value: `${progress} / ${needed}`, inline: true },
                { name: 'Total XP', value: `${row.xp}`, inline: true },
                { name: 'XP Needed for Next Level', value: `${needed - progress}`, inline: false }
            );

        await interaction.reply({ embeds: [embed] });
    },
};
