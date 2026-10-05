const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const { awardXp } = require('../../utils/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addxp')
        .setDescription('Add XP to a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to give XP to').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('amount').setDescription('Amount of XP to add').setRequired(true).setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        const { xp, level, leveledUp } = awardXp(interaction.guild.id, target.id, amount);

        await interaction.reply({
            content: `Added **${amount} XP** to ${target.tag}. They are now at **${xp} XP**, Level **${level}**${leveledUp ? ' (leveled up!)' : ''}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
