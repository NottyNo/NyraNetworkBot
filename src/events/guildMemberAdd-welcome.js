const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { colors: { embed: embedColor } } = require('../config/colors.json');

// TODO: replace with the real path to your welcome image once it's ready
const WELCOME_IMAGE_PATH = './assets/welcome-banner.png';

// TODO: set the channel ID where welcome messages should be posted
const WELCOME_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) {
            console.warn(`Welcome channel (${WELCOME_CHANNEL_ID}) not found in guild ${member.guild.id}.`);
            return;
        }

        const welcomeText =
`-ˋˏ                                                              ༻❁༺                                                                                ˎˊ-
                                                              𝖋𝖊𝖗𝖗𝖚𝖍𝖘𝖒𝖕
       ᘐ ·: welcome to the server ${member} !
                ︶︶   - ! enjoy your stay`;

        const embed = new EmbedBuilder()
            .setDescription(welcomeText)
            .setColor(embedColor);

        try {
            const attachment = new AttachmentBuilder(WELCOME_IMAGE_PATH, { name: 'welcome.png' });
            embed.setImage('attachment://welcome.png');

            await channel.send({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.warn('Welcome image could not be loaded, sending without it:', error.message);
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    },
};