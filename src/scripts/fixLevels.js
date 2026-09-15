const db = require('../database/db');
const { client } = require('../index.js');
const { RESTEvents } = require('discord.js');

client.rest.on(RESTEvents.Response, (request, response) => {
    if (response.status !== 403 && response.status !== 429) return;

    console.log('Discord API request was limited.');
});

function xpForLevel(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

function run() {
    const rows = db.prepare(`SELECT * FROM levels`).all();
    let fixedCount = 0;

    for (const row of rows) {
        let correctLevel = 0;
        while (row.xp >= xpForLevel(correctLevel)) {
            correctLevel += 1;
        }

        if (correctLevel !== row.level) {
            db.prepare(`
                UPDATE levels SET level = ? WHERE guildId = ? AND userId = ?
            `).run(correctLevel, row.guildId, row.userId);

            console.log(`Fixed ${row.userId} in guild ${row.guildId}: level ${row.level} -> ${correctLevel} (xp: ${row.xp})`);
            fixedCount++;
        }
    }

    console.log(`\nDone. Fixed ${fixedCount} out of ${rows.length} user(s).`);
}

run();