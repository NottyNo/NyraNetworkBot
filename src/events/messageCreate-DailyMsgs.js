const { Events } = require('discord.js');
const db = require('../database/db');

module.exports = {
    name: Events.MessageCreate,
    execute(message) {
        if (message.author.bot || !message.guild) return;

        const date = new Date().toISOString().slice(0, 10); // UTC date, e.g. "2026-09-16"

        db.prepare(`
            INSERT INTO daily_messages (guildId, userId, date, count)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(guildId, userId, date) DO UPDATE SET count = count + 1
        `).run(message.guild.id, message.author.id, date);
    },
};