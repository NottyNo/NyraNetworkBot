const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Replies with your input!')
    .addStringOption((option) =>
      option
        .setName('input')
        .setDescription('The input to echo back')
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('ephemeral')
        .setDescription('Whether or not the reply should be ephemeral')
        .setRequired(false),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('input');
    const ephemeral = interaction.options.getBoolean('ephemeral') || false;

    await interaction.reply({
      content: input,
      flags: ephemeral ? ephemeral : undefined,
    });
  },
};
