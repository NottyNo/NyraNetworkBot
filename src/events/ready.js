const { Events, ActivityType } = require('discord.js');
const db = require('../database/db');

const activities = [
    { name: '/help for commands', type: ActivityType.Listening },
    { name: 'Join NyraNetwork', type: ActivityType.Listening },
];

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        let i = 0;
        client.user.setPresence({ activities: [activities[i]], status: 'online' });

        // Rotate every 30 seconds
        setInterval(() => {
            i = (i + 1) % activities.length;
            client.user.setPresence({ activities: [activities[i]], status: 'online' });
        }, 30000);

        // Clear any stale sessions from before the restart
        db.prepare(`DELETE FROM voice_sessions`).run();

        // Re-register everyone currently in a voice channel as freshly joined
        const insertSession = db.prepare(`
            INSERT OR REPLACE INTO voice_sessions (guildId, userId, joinedAt)
            VALUES (?, ?, ?)
        `);

        for (const guild of client.guilds.cache.values()) {
            const channels = guild.channels.cache.filter((c) => c.isVoiceBased());
            for (const channel of channels.values()) {
                for (const member of channel.members.values()) {
                    if (member.user.bot) continue;
                    insertSession.run(guild.id, member.id, Date.now());
                }
            }
        }
    },
};
