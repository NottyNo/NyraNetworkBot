const { Events } = require('discord.js');
const db = require('../database/db');

const { words: bannedWords } = require('../config/bannedWords.json');

// --- Spam detection settings ---
const SPAM_WINDOW_MS = 5000;   // time window to count messages in
const SPAM_MESSAGE_LIMIT = 5;  // max messages allowed within that window
const SPAM_DUPLICATE_LIMIT = 3; // max identical messages in a row before flagged

const messageLog = new Map(); // key: `${guildId}-${userId}` -> array of { content, timestamp }

async function issueAutomodWarn(message, reason) {
    await message.delete().catch(() => {});

    db.prepare(`
        INSERT INTO warns (guildId, userId, moderatorId, reason, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `).run(message.guild.id, message.author.id, message.client.user.id, reason, Date.now());

    const warnCount = db.prepare(`
        SELECT COUNT(*) AS count FROM warns WHERE guildId = ? AND userId = ?
    `).get(message.guild.id, message.author.id).count;

    await message.channel.send(`${message.author}, ${reason.toLowerCase()}! (Warning ${warnCount})`);

    if (warnCount >= 3) {
        const member = await message.guild.members.fetch(message.author.id);
        await member.timeout(10 * 60 * 1000, `Reached 3 automod warnings (${reason})`);
    }
}

function isSpamming(message) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();

    const history = messageLog.get(key) ?? [];

    // Drop entries outside the time window
    const recent = history.filter((entry) => now - entry.timestamp < SPAM_WINDOW_MS);
    recent.push({ content: message.content, timestamp: now });
    messageLog.set(key, recent);

    // Too many messages in the window
    if (recent.length > SPAM_MESSAGE_LIMIT) {
        return 'Automod: message spam';
    }

    // Same message repeated too many times in a row
    const lastFew = recent.slice(-SPAM_DUPLICATE_LIMIT);
    if (
        lastFew.length === SPAM_DUPLICATE_LIMIT &&
        lastFew.every((entry) => entry.content === message.content && entry.content.length > 0)
    ) {
        return 'Automod: duplicate message spam';
    }

    return null;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- Banned words check ---
        const containsBanned = bannedWords.some((word) =>
            message.content.toLowerCase().includes(word)
        );

        if (containsBanned) {
            return issueAutomodWarn(message, 'Automod: banned word');
        }

        // --- Spam check ---
        const spamReason = isSpamming(message);
        if (spamReason) {
            return issueAutomodWarn(message, spamReason);
        }
    },
};