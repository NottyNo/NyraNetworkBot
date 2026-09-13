const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Voice mutes a user in the server.')
        .addUserOption((option) =>
                        option.setName('target').setDescription('The user to mute').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: 'The specified user is not a member of this server.',
                ephemeral: true,
            });
        } else {
            try {
                await member.voice.setMute(true);
                await interaction.reply({
                    content: `Successfully muted ${targetUser.tag}.`,
                    ephemeral: true,
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'An error occurred while trying to mute the user.',
                    ephemeral: true,
                });
            }
        }
    }
}