const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database/db');

function xpForLevel(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removexp')
        .setDescription('Remove XP from a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to remove XP from').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('amount').setDescription('Amount of XP to remove').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return interaction.reply({
                content: 'Amount must be a positive number.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const row = db.prepare(`
            SELECT * FROM levels WHERE guildId = ? AND userId = ?
        `).get(interaction.guild.id, target.id);

        if (!row) {
            return interaction.reply({
                content: `${target.tag} has no XP to remove.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const newXp = Math.max(0, row.xp - amount);

        // Recalculate level downward if XP now falls below their current level's requirement
        let newLevel = 0;
        while (newXp >= xpForLevel(newLevel)) {
            newLevel += 1;
        }

        db.prepare(`
            UPDATE levels SET xp = ?, level = ? WHERE guildId = ? AND userId = ?
        `).run(newXp, newLevel, interaction.guild.id, target.id);

        const leveledDown = newLevel < row.level;

        await interaction.reply({
            content: `Removed **${amount} XP** from ${target.tag}. They are now at **${newXp} XP**, Level **${newLevel}**${leveledDown ? ' (leveled down)' : ''}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};