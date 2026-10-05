const { Events } = require('discord.js');
const db = require('../database/db');
const { getMultiplier, awardXp, getLevelUpChannel } = require('../utils/xp');

const XP_COOLDOWN = 60 * 1000;
const MIN_XP = 15;
const MAX_XP = 25;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const row = db
            .prepare(`SELECT lastMessage FROM levels WHERE guildId = ? AND userId = ?`)
            .get(message.guild.id, message.author.id);

        const now = Date.now();
        if (row && now - row.lastMessage < XP_COOLDOWN) return;

        const member =
            message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
        if (!member) return;

        const multiplier = getMultiplier(member);
        const gainedXp = Math.floor((Math.random() * (MAX_XP - MIN_XP + 1) + MIN_XP) * multiplier);

        const { level, leveledUp } = awardXp(message.guild.id, message.author.id, gainedXp, now);

        if (leveledUp) {
            getLevelUpChannel(message.guild)
                ?.send(`Congratulations ${message.author}, you leveled up to **level ${level}**!`)
                .catch(() => {});
        }
    },
};
