const { Events } = require('discord.js');
const db = require('../database/db');
const { getMultiplier, awardXp, getLevelUpChannel } = require('../utils/xp');

const XP_PER_MINUTE = 5;

function awardVoiceXp(guildId, userId, member, minutesSpent) {
    if (minutesSpent < 1) return;

    const multiplier = getMultiplier(member);
    const gainedXp = Math.floor(minutesSpent * XP_PER_MINUTE * multiplier);

    const { level, leveledUp } = awardXp(guildId, userId, gainedXp);

    if (leveledUp) {
        getLevelUpChannel(member.guild)
            ?.send(`${member}, you leveled up to **level ${level}** from voice activity!`)
            .catch(() => {});
    }
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member ?? oldState.member;
        if (!member || member.user.bot) return;

        const guildId = oldState.guild.id;
        const userId = member.id;

        // Joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            db.prepare(`
                INSERT OR REPLACE INTO voice_sessions (guildId, userId, joinedAt)
                VALUES (?, ?, ?)
            `).run(guildId, userId, Date.now());
            return;
        }

        // Left voice entirely
        if (oldState.channelId && !newState.channelId) {
            const session = db
                .prepare(`SELECT * FROM voice_sessions WHERE guildId = ? AND userId = ?`)
                .get(guildId, userId);

            if (session) {
                const minutesSpent = (Date.now() - session.joinedAt) / 60000;
                awardVoiceXp(guildId, userId, member, minutesSpent);

                db.prepare(`DELETE FROM voice_sessions WHERE guildId = ? AND userId = ?`).run(guildId, userId);
            }
        }
    },
};
