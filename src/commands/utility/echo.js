const { SlashCommandBuilder } = require('discord.js');
const { execute } = require('./ping');

const data = (new SlashCommandBuilder()
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
      .setDescription('Wether or not the reply should be ephemeral')
      .setRequired(false),
  ).execute = async (interaction) => {
  const input = interaction.options.getString('input');
  const ephemeral = interaction.options.getBoolean('ephemeral') || false;

  interaction.reply({ content: input, ephemeral: ephemeral });
});
