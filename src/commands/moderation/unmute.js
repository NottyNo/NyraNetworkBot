const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Removes the voice mute from a user.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to unmute').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: 'The specified user is not a member of this server.',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!member.voice.channel) {
            return interaction.reply({
                content: 'That user is not in a voice channel.',
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            await member.voice.setMute(false);
            await interaction.reply({
                content: `Successfully unmuted ${targetUser.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: 'An error occurred while trying to unmute the user.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
