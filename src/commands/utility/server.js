const { SlashCommandBuilder } = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides information about the server.')
		.addUserOption((option) =>
			option
				.setName('target')
				.setDescription('The user to ping in the server info message.')
				.setRequired(false)),
	async execute(interaction) {
		// interaction.guild is the object representing the Guild in which the command was run
		const targetUser = interaction.options.getUser('target');
		const serverInfoEmbed = {
			color: 0x0099ff,
			title: 'Server Information',
			description: `IP: play.nyra.network `,
		};
		await interaction.reply({ 
			content: targetUser ? `${targetUser}` : `${interaction.user}`,
			embeds: [serverInfoEmbed] 
		});
	},
};