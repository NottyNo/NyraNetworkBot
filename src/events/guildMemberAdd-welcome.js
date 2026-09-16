const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database/db');
const { colors: { embed: embedColor } } = require('../config/colors.json');

const WELCOME_IMAGE_PATH = '../images/welcome.png';

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const settings = db.prepare(`
            SELECT welcomeChannelId FROM guild_settings WHERE guildId = ?
        `).get(member.guild.id);

        if (!settings?.welcomeChannelId) {
            // No welcome channel configured for this server yet
            return;
        }

        const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
        if (!channel) {
            console.warn(`Welcome channel (${settings.welcomeChannelId}) not found in guild ${member.guild.id}.`);
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