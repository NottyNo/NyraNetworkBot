const {SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, EmbedBuilder} = require('discord.js');

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
                .setDescription('The duration of the timeout in minutes (1-20160)')
                .setRequired(true))
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
        }else if (!interaction.guild.members.cache.get(targetUser.id)) {
            return interaction.reply({
                content: 'The specified user is not a member of this server.',
                ephemeral: true,
            });
        }
        else if (duration < 1 || duration > 20160) {
            return interaction.reply({
                content: 'The duration must be between 1 and 20160 minutes (14 days).',
                ephemeral: true,
            });
        }
        else {
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
                await targetUser.send({ embeds: [timeoutEmbed] });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'An error occurred while trying to timeout the user.',
                    ephemeral: true,
                });
            }
        }
    }
};