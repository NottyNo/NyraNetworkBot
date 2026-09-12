const {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server.')
    .addUserOption((option) => option.setName('target'))
    .setDescription('The user to ban')
    .setRequired(true)
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the ban')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setContexts(InteractionContextType.Guild),
    ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if(!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: 'You do not have permission to ban members.',
                ephemeral: true,
            });
        } else if(!interaction.guild.members.cache.get(targetUser.id)) {
            return interaction.reply({
                content: 'The specified user is not a member of this server.',
                ephemeral: true,
            });
        } else {
            try {
                await interaction.guild.members.ban(targetUser, { reason });
                await interaction.reply({
                    content: `Successfully banned ${targetUser.tag}.`,
                    ephemeral: true,
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'An error occurred while trying to ban the user.',
                    ephemeral: true,
                });
            }
        }
    }
};
