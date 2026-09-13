const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

// Ensure the data folder exists before creating the DB file there
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'nyra.db'));

// Recommended for better performance with concurrent reads/writes
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS warns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT NOT NULL,
        userId TEXT NOT NULL,
        moderatorId TEXT NOT NULL,
        reason TEXT,
        type TEXT NOT NULL DEFAULT 'manual',
        timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS levels (
        guildId TEXT NOT NULL,
        userId TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        lastMessage INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guildId, userId)
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
        guildId TEXT NOT NULL,
        userId TEXT NOT NULL,
        joinedAt INTEGER NOT NULL,
        PRIMARY KEY (guildId, userId)
    );
    
    CREATE TABLE IF NOT EXISTS stat_channels (
        guildId TEXT NOT NULL,
        key TEXT NOT NULL,
        channelId TEXT NOT NULL,
        PRIMARY KEY (guildId, key)
    )
`);

module.exports = db;