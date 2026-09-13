const { Events } = require('discord.js');
const db = require('../database/db');
const { getMultiplier, xpForLevel } = require('../utils/xp');

const XP_PER_MINUTE = 5;

function awardVoiceXp(guildId, userId, member, minutesSpent) {
    if (minutesSpent < 1) return;

    const multiplier = getMultiplier(member);
    const gainedXp = Math.floor(minutesSpent * XP_PER_MINUTE * multiplier);

    const row = db.prepare(`
        SELECT * FROM levels WHERE guildId = ? AND userId = ?
    `).get(guildId, userId);

    if (!row) {
        db.prepare(`
            INSERT INTO levels (guildId, userId, xp, level, lastMessage)
            VALUES (?, ?, ?, 0, 0)
        `).run(guildId, userId, gainedXp);
        return;
    }

    const newXp = row.xp + gainedXp;
    let newLevel = row.level;
    let leveledUp = false;

    if (newXp >= xpForLevel(row.level)) {
        newLevel += 1;
        leveledUp = true;
    }

    db.prepare(`
        UPDATE levels SET xp = ?, level = ? WHERE guildId = ? AND userId = ?
    `).run(newXp, newLevel, guildId, userId);

    if (leveledUp) {
        member.guild.systemChannel?.send(`🎉 ${member}, you leveled up to **level ${newLevel}** from voice activity!`).catch(() => {});
    }
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member ?? oldState.member;
        if (member.user.bot) return;

        const guildId = oldState.guild.id;
        const userId = member.id;

        // User joined a voice channel (wasn't in one before)
        if (!oldState.channelId && newState.channelId) {
            db.prepare(`
                INSERT OR REPLACE INTO voice_sessions (guildId, userId, joinedAt)
                VALUES (?, ?, ?)
            `).run(guildId, userId, Date.now());
            return;
        }

        // User left a voice channel entirely (was in one, now isn't)
        if (oldState.channelId && !newState.channelId) {
            const session = db.prepare(`
                SELECT * FROM voice_sessions WHERE guildId = ? AND userId = ?
            `).get(guildId, userId);

            if (session) {
                const minutesSpent = (Date.now() - session.joinedAt) / 60000;
                awardVoiceXp(guildId, userId, member, minutesSpent);

                db.prepare(`
                    DELETE FROM voice_sessions WHERE guildId = ? AND userId = ?
                `).run(guildId, userId);
            }
            return;
        }

        // User switched channels — continuous session, no action needed
    },
};