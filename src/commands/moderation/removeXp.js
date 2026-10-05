const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const db = require('../../database/db');
const { levelFromXp } = require('../../utils/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removexp')
        .setDescription('Remove XP from a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to remove XP from').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('amount').setDescription('Amount of XP to remove').setRequired(true).setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        const row = db
            .prepare(`SELECT * FROM levels WHERE guildId = ? AND userId = ?`)
            .get(interaction.guild.id, target.id);

        if (!row) {
            return interaction.reply({
                content: `${target.tag} has no XP to remove.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const newXp = Math.max(0, row.xp - amount);
        const newLevel = levelFromXp(newXp);

        db.prepare(`UPDATE levels SET xp = ?, level = ? WHERE guildId = ? AND userId = ?`).run(
            newXp,
            newLevel,
            interaction.guild.id,
            target.id
        );

        const leveledDown = newLevel < row.level;

        await interaction.reply({
            content: `Removed **${amount} XP** from ${target.tag}. They are now at **${newXp} XP**, Level **${newLevel}**${leveledDown ? ' (leveled down)' : ''}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
