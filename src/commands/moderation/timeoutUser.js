const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeouts a user from the server.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption((option) =>
            option
                .setName('duration')
                .setDescription('The duration of the timeout')
                .setRequired(true)
                .addChoices(
                    { name: '60 seconds', value: 1 },
                    { name: '5 minutes', value: 5 },
                    { name: '10 minutes', value: 10 },
                    { name: '1 hour', value: 60 },
                    { name: '1 day', value: 1440 },
                    { name: '1 week', value: 10080 },
                    { name: '2 weeks', value: 20160 },
                ))
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                content: 'You do not have permission to timeout members.',
                ephemeral: true,
            });
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: 'The specified user is not a member of this server.',
                ephemeral: true,
            });
        }

        try {
            await member.timeout(duration * 60 * 1000, reason);
            await interaction.reply({
                content: `Successfully timed out ${targetUser.tag}.`,
                ephemeral: true,
            });

            const timeoutEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('You have been timed out')
                .setDescription(`You have been timed out from ${interaction.guild.name} for ${duration} minutes. Reason: ${reason}`);
            await targetUser.send({ embeds: [timeoutEmbed] }).catch(() => null);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'An error occurred while trying to timeout the user.',
                ephemeral: true,
            });
        }
    },
};