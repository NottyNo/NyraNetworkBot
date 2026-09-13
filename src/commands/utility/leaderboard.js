const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server XP leaderboard.'),
    async execute(interaction) {
        const rows = db.prepare(`
            SELECT * FROM levels WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT 10
        `).all(interaction.guild.id);

        if (rows.length === 0) {
            return interaction.reply('No one has earned XP yet.');
        }

        const description = await Promise.all(
            rows.map(async (row, i) => {
                const user = await interaction.client.users.fetch(row.userId).catch(() => null);
                const name = user ? user.tag : `Unknown User (${row.userId})`;
                return `**${i + 1}.** ${name} — Level ${row.level} (${row.xp} XP)`;
            })
        );

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
            .setColor(0xf1c40f)
            .setDescription(description.join('\n'));

        await interaction.reply({ embeds: [embed] });
    },
};