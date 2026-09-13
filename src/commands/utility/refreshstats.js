const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { syncStatChannels } = require('../../utils/statChannels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refreshstats')
        .setDescription('Sync stats channels with the current config (creates, renames, removes as needed).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const results = await syncStatChannels(interaction.guild);

            const embed = new EmbedBuilder()
                .setTitle('Stats Channels Synced')
                .setColor(0x2ecc71)
                .addFields(
                    { name: 'Created', value: results.created.length ? results.created.join('\n') : 'None' },
                    { name: 'Renamed', value: results.renamed.length ? results.renamed.join('\n') : 'None' },
                    { name: 'Removed', value: results.removed.length ? results.removed.join('\n') : 'None' },
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Something went wrong while syncing stats channels.');
        }
    },
};