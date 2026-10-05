// Recalculates every user's level from their total XP.
// Run with: node src/scripts/fixLevels.js  (stop the bot first, or at least expect brief overlap)
const db = require('../database/db');
const { levelFromXp } = require('../utils/xp');

const rows = db.prepare(`SELECT * FROM levels`).all();
const update = db.prepare(`UPDATE levels SET level = ? WHERE guildId = ? AND userId = ?`);
let fixedCount = 0;

for (const row of rows) {
    const correctLevel = levelFromXp(row.xp);

    if (correctLevel !== row.level) {
        update.run(correctLevel, row.guildId, row.userId);
        console.log(`Fixed ${row.userId} in guild ${row.guildId}: level ${row.level} -> ${correctLevel} (xp: ${row.xp})`);
        fixedCount++;
    }
}

console.log(`\nDone. Fixed ${fixedCount} out of ${rows.length} user(s).`);
