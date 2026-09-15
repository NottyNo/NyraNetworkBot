const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setupStatChannels } = require('../../utils/statChannels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupstats')
        .setDescription('Create the server stats channels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await setupStatChannels(interaction.guild);
        await interaction.editReply('Stats channels created.');
    },
};