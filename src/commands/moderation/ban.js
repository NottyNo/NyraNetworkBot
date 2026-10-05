const {
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require('discord.js');
const { getTargetError } = require('../../utils/moderation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to ban').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('The reason for the ban')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Bans work by ID, so the user does not need to be a current member
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const error = getTargetError(interaction, targetUser, member, member ? member.bannable : true);
        if (error) {
            return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
        }

        try {
            await interaction.guild.members.ban(targetUser.id, { reason });
            await interaction.reply({
                content: `Successfully banned ${targetUser.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: 'An error occurred while trying to ban the user.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
