const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

const JOB_IMAGE_PATH = path.join(__dirname, '../../images/job-application.png');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getajob')
        .setDescription('Get a j*b.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to ping.')
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('GET A J*B!')
            .setDescription(`${user} you need to get a j*b!`);

        try {
            const attachment = new AttachmentBuilder(JOB_IMAGE_PATH, { name: 'job-application.png' });
            embed.setImage('attachment://job-application.png');

            await interaction.reply({
                content: `${user}`,
                embeds: [embed],
                files: [attachment],
            });
        } catch (error) {
            console.warn('Job image could not be loaded, sending without it:', error.message);
            await interaction.reply({
                content: `${user}`,
                embeds: [embed],
            }).catch(() => {});
        }
    },
};