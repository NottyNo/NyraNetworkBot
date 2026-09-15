const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database/db');

function xpForLevel(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addxp')
        .setDescription('Add XP to a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to give XP to').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('amount').setDescription('Amount of XP to add').setRequired(true)
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
            // No row yet — create one with the added XP as their starting total
            let newLevel = 0;
            let xp = amount;

            while (xp >= xpForLevel(newLevel)) {
                newLevel += 1;
            }

            db.prepare(`
                INSERT INTO levels (guildId, userId, xp, level, lastMessage)
                VALUES (?, ?, ?, ?, 0)
            `).run(interaction.guild.id, target.id, xp, newLevel);

            return interaction.reply({
                content: `✅ Added **${amount} XP** to ${target.tag}. They are now **Level ${newLevel}**.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const newXp = row.xp + amount;
        let newLevel = row.level;
        let leveledUp = false;

        while (newXp >= xpForLevel(newLevel)) {
            newLevel += 1;
            leveledUp = true;
        }

        db.prepare(`
            UPDATE levels SET xp = ?, level = ? WHERE guildId = ? AND userId = ?
        `).run(newXp, newLevel, interaction.guild.id, target.id);

        await interaction.reply({
            content: `Added **${amount} XP** to ${target.tag}. They are now at **${newXp} XP**, Level **${newLevel}**${leveledUp ? ' (leveled up!)' : ''}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};