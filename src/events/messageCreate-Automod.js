const { Events } = require('discord.js');
const db = require('../database/db');

const { words: bannedWords } = require('../config/bannedWords.json');

// --- Spam detection settings ---
const SPAM_WINDOW_MS = 5000;
const SPAM_MESSAGE_LIMIT = 5;
const SPAM_DUPLICATE_LIMIT = 15;
const SPAM_TIMEOUT_MS = 60 * 1000;
const SPAM_WARN_DECAY_MS = 5 * 60 * 1000;
const SPAM_TRIGGER_COOLDOWN_MS = 10 * 1000;

const messageLog = new Map();
const spamDecayTimers = new Map();
const lastSpamTrigger = new Map();

async function issueAutomodWarn(message, reason, options = {}) {
    await message.delete().catch(() => {});

    db.prepare(`
        INSERT INTO warns (guildId, userId, moderatorId, reason, type, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        message.guild.id,
        message.author.id,
        message.client.user.id,
        reason,
        options.type ?? 'manual',
        Date.now()
    );

    const warnCount = db.prepare(`
        SELECT COUNT(*) AS count FROM warns WHERE guildId = ? AND userId = ?
    `).get(message.guild.id, message.author.id).count;

    // Send the warning privately via DM instead of in the channel and log to console
    await message.author.send(
        console.log(`Sending automod warning to ${message.author.tag} (${message.author.id}): ${reason} : Warning #${warnCount}`),
        `⚠️ You were warned in **${message.guild.name}**: ${reason.toLowerCase()}! (Warning ${warnCount})`
    ).catch(() => {
        // User has DMs disabled or blocked the bot
        console.warn(`Could not DM warning to ${message.author.tag} (${message.author.id}).`);
    });

    const member = await message.guild.members.fetch(message.author.id);

    if (options.immediateTimeoutMs) {
        await member.timeout(options.immediateTimeoutMs, reason).catch(() => {});
        return;
    }

    if (warnCount >= 3) {
        await member.timeout(10 * 60 * 1000, `Reached 3 automod warnings (${reason})`).catch(() => {});
    }
}

function scheduleSpamWarnDecay(guildId, userId) {
    const key = `${guildId}-${userId}`;

    if (spamDecayTimers.has(key)) {
        clearTimeout(spamDecayTimers.get(key));
    }

    const timer = setTimeout(() => {
        db.prepare(`
            DELETE FROM warns WHERE guildId = ? AND userId = ? AND type = 'spam'
        `).run(guildId, userId);

        spamDecayTimers.delete(key);
    }, SPAM_WARN_DECAY_MS);

    spamDecayTimers.set(key, timer);
}

function isSpamming(message) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();

    const history = messageLog.get(key) ?? [];
    const recent = history.filter((entry) => now - entry.timestamp < SPAM_WINDOW_MS);
    recent.push({ content: message.content, timestamp: now });
    messageLog.set(key, recent);

    const lastTrigger = lastSpamTrigger.get(key) ?? 0;
    if (now - lastTrigger < SPAM_TRIGGER_COOLDOWN_MS) {
        return null;
    }

    if (recent.length > SPAM_MESSAGE_LIMIT) {
        lastSpamTrigger.set(key, now);
        messageLog.set(key, []);
        return 'Automod: message spam';
    }

    const lastFew = recent.slice(-SPAM_DUPLICATE_LIMIT);
    if (
        lastFew.length === SPAM_DUPLICATE_LIMIT &&
        lastFew.every((entry) => entry.content === message.content && entry.content.length > 0)
    ) {
        lastSpamTrigger.set(key, now);
        messageLog.set(key, []);
        return 'Automod: duplicate message spam';
    }

    return null;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const containsBanned = bannedWords.some((word) =>
            message.content.toLowerCase().includes(word)
        );

        if (containsBanned) {
            return issueAutomodWarn(message, 'Automod: banned word', { type: 'bannedword' });
        }

        const spamReason = isSpamming(message);
        if (spamReason) {
            await issueAutomodWarn(message, spamReason, {
                immediateTimeoutMs: SPAM_TIMEOUT_MS,
                type: 'spam',
            });
            scheduleSpamWarnDecay(message.guild.id, message.author.id);
        }
    },
};