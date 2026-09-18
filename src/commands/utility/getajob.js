const { PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');
const JOB_IMAGE_PATH = '../images/job-application.png';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getajob')
        .setDescription('Get a j*b.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to ping.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        interaction.reply({
            content: `${user}`,
            embeds: [
                new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle('GET A J*B!')
                    .setDescription(`${user} you need to get a j*b!`)
            ]
        })
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('GET A J*B!')
            .setDescription(`${user} you need to get a j*b!`)
        try {
            const attachment = new AttachmentBuilder(JOB_IMAGE_PATH, { name: 'job-application.png' });
            embed.setImage('attachment://job.png');

            await channel.send({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.warn('Job image could not be loaded, sending without it:', error.message);
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}