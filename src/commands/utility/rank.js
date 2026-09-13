const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');

function xpForLevel(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription("Check your or another user's level and XP.")
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to check').setRequired(false)
        ),
    async execute(interaction) {
        const target = interaction.options.getUser('target') ?? interaction.user;

        const row = db.prepare(`
            SELECT * FROM levels WHERE guildId = ? AND userId = ?
        `).get(interaction.guild.id, target.id);

        if (!row) {
            return interaction.reply({
                content: `${target.tag} hasn't earned any XP yet.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const needed = xpForLevel(row.level);

        const embed = new EmbedBuilder()
            .setTitle(`${target.username}'s Rank`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(0x5865f2)
            .addFields(
                { name: 'Level', value: `${row.level}`, inline: true },
                { name: 'XP', value: `${row.xp} / ${needed}`, inline: true },
            );

        await interaction.reply({ embeds: [embed] });
    },
};