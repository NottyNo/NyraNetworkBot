const { Events } = require('discord.js');
const db = require('../database/db');
const { endGiveaway } = require('../utils/giveaways');

const CHECK_INTERVAL_MS = 30 * 1000;

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        setInterval(async () => {
            const expired = db.prepare(`
                SELECT * FROM giveaways WHERE ended = 0 AND endTime <= ?
            `).all(Date.now());

            for (const row of expired) {
                await endGiveaway(client, row).catch((err) =>
                    console.error(`Failed to auto-end giveaway #${row.id}:`, err)
                );
            }
        }, CHECK_INTERVAL_MS);
    },
};