const db = require('../database/db');
const { roleMultipliers, default: defaultMultiplier } = require('../config/xpMultipliers.json');
const { levelUpChannelId } = require('../config/settings.json');

function getMultiplier(member) {
    let highest = defaultMultiplier;

    for (const [roleId, multiplier] of Object.entries(roleMultipliers)) {
        if (member.roles.cache.has(roleId) && multiplier > highest) {
            highest = multiplier;
        }
    }

    return highest;
}

// XP needed to go from `level` to `level + 1`
function xpForLevel(level) {
    return 5 * level ** 2 + 50 * level + 100;
}

// Total XP needed to reach `level` (sum of xpForLevel(0..level-1))
function totalXpForLevel(level) {
    if (level <= 0) return 0;
    return 5 * (((level - 1) * level * (2 * level - 1)) / 6) + 25 * level * (level - 1) + 100 * level;
}

function levelFromXp(xp) {
    let level = 0;
    while (xp >= totalXpForLevel(level + 1)) {
        level += 1;
    }
    return level;
}

function getLevelUpChannel(guild) {
    if (!levelUpChannelId) return null;
    return guild.channels.cache.get(levelUpChannelId) ?? null;
}

/**
 * Adds XP to a user, recalculates their level and saves it.
 * Pass `lastMessage` (a timestamp) to also update the message cooldown marker.
 */
function awardXp(guildId, userId, amount, lastMessage = null) {
    const row = db
        .prepare(`SELECT xp, level FROM levels WHERE guildId = ? AND userId = ?`)
        .get(guildId, userId);

    const oldLevel = row?.level ?? 0;
    const xp = (row?.xp ?? 0) + amount;
    const level = levelFromXp(xp);

    db.prepare(`
        INSERT INTO levels (guildId, userId, xp, level, lastMessage)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guildId, userId) DO UPDATE SET
            xp = excluded.xp,
            level = excluded.level,
            lastMessage = COALESCE(?, lastMessage)
    `).run(guildId, userId, xp, level, lastMessage ?? 0, lastMessage);

    return { xp, level, leveledUp: level > oldLevel };
}

module.exports = {
    getMultiplier,
    xpForLevel,
    totalXpForLevel,
    levelFromXp,
    getLevelUpChannel,
    awardXp,
};
