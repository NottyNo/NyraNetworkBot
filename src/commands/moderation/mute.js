const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} = require('discord.js');
const { getTargetError } = require('../../utils/moderation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Voice mutes a user in the server.')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to mute').setRequired(true)
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

        const error = getTargetError(interaction, targetUser, member, member.manageable);
        if (error) {
            return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
        }

        if (!member.voice.channel) {
            return interaction.reply({
                content: 'That user is not in a voice channel.',
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            await member.voice.setMute(true);
            await interaction.reply({
                content: `Successfully muted ${targetUser.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: 'An error occurred while trying to mute the user.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
