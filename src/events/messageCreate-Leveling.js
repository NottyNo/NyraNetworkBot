const { Events } = require('discord.js');
const db = require('../database/db');
const { getMultiplier, xpForLevel } = require('../utils/xp');

const XP_COOLDOWN = 0 * 1000;
const MIN_XP = 15;
const MAX_XP = 25;
const LEVEL_UP_CHANNEL_ID = '1549377391648837652'; // <-- set the same channel ID here

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const row = db.prepare(`
            SELECT * FROM levels WHERE guildId = ? AND userId = ?
        `).get(message.guild.id, message.author.id);

        const now = Date.now();
        if (row && now - row.lastMessage < XP_COOLDOWN) return;

        const member = await message.guild.members.fetch(message.author.id);
        const multiplier = getMultiplier(member);
        const gainedXp = Math.floor((Math.random() * (MAX_XP - MIN_XP + 1) + MIN_XP) * multiplier);

        if (!row) {
            db.prepare(`
                INSERT INTO levels (guildId, userId, xp, level, lastMessage)
                VALUES (?, ?, ?, 0, ?)
            `).run(message.guild.id, message.author.id, gainedXp, now);
            return;
        }

        const newXp = row.xp + gainedXp;
        let newLevel = row.level;
        let leveledUp = false;

        while (newXp >= xpForLevel(newLevel)) {
            newLevel += 1;
            leveledUp = true;
        }

        db.prepare(`
            UPDATE levels SET xp = ?, level = ?, lastMessage = ?
            WHERE guildId = ? AND userId = ?
        `).run(newXp, newLevel, now, message.guild.id, message.author.id);

        if (leveledUp) {
            const channel = message.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
            channel?.send(`Congratulations ${message.author}, you leveled up to **level ${newLevel}**!`).catch(() => {});
        }
    },
};