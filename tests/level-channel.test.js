const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Database = require('better-sqlite3');

function load(file, overrides = {}) {
    const filename = path.resolve(__dirname, '..', file);
    const nativeRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        module, exports: module.exports, __dirname: path.dirname(filename), console,
        require: (name) => Object.hasOwn(overrides, name) ? overrides[name] : nativeRequire(name),
    }, { filename });
    return module.exports;
}

function migrate(db) {
    return load('src/database/db.js', {
        'better-sqlite3': function () { return db; },
        'node:fs': { existsSync: () => true },
    });
}

test('migration preserves existing settings and can run twice', () => {
    const db = new Database(':memory:');
    try {
        db.exec("CREATE TABLE guild_settings (guildId TEXT PRIMARY KEY, welcomeChannelId TEXT); INSERT INTO guild_settings VALUES ('guild', 'welcome')");
        migrate(db);
        migrate(db);
        assert.deepEqual(db.prepare('SELECT * FROM guild_settings').get(), {
            guildId: 'guild', welcomeChannelId: 'welcome', levelChannelId: null,
        });
    } finally { db.close(); }
});

test('command updates only its server and rejects channels the bot cannot use', async () => {
    const db = migrate(new Database(':memory:'));
    try {
        db.exec("INSERT INTO guild_settings VALUES ('guild', 'welcome', 'old'); INSERT INTO guild_settings VALUES ('other', NULL, 'other-channel')");
        const command = load('src/commands/moderation/setLevelChannel.js', { '../../database/db': db });
        assert.equal(command.data.toJSON().name, 'setlevelchannel');
        let allowed = true;
        const channel = { id: 'new', permissionsFor: () => ({ has: () => allowed }) };
        const interaction = {
            guild: { id: 'guild' }, client: { user: {} },
            options: { getChannel: () => channel }, reply: async () => {},
        };
        await command.execute(interaction);
        assert.deepEqual(db.prepare('SELECT * FROM guild_settings WHERE guildId = ?').get('guild'), {
            guildId: 'guild', welcomeChannelId: 'welcome', levelChannelId: 'new',
        });
        allowed = false;
        channel.id = 'blocked';
        await command.execute(interaction);
        assert.equal(db.prepare('SELECT levelChannelId FROM guild_settings WHERE guildId = ?').get('guild').levelChannelId, 'new');
        assert.equal(db.prepare('SELECT levelChannelId FROM guild_settings WHERE guildId = ?').get('other').levelChannelId, 'other-channel');
    } finally { db.close(); }
});

test('text and voice level-ups use the saved channel; unconfigured servers still earn XP', async () => {
    const db = migrate(new Database(':memory:'));
    try {
        const sent = [];
        const guild = {
            id: 'guild',
            channels: { cache: new Map([['selected', { send: async (text) => sent.push(text) }]]) },
            members: { fetch: async () => member },
        };
        const member = { id: 'user', user: { bot: false }, guild, roles: { cache: new Map() } };
        const xp = load('src/utils/xp.js', { '../database/db': db });
        const dependencies = { '../database/db': db, '../utils/xp': xp };
        const text = load('src/events/messageCreate-Leveling.js', dependencies);
        const voice = load('src/events/VoiceStateUpdate-VoiceXP.js', dependencies);
        for (const configured of [false, true]) {
            if (configured) db.prepare('INSERT INTO guild_settings (guildId, levelChannelId) VALUES (?, ?)').run('guild', 'selected');
            db.prepare('INSERT OR REPLACE INTO levels VALUES (?, ?, 99, 0, 0)').run('guild', 'user');
            await text.execute({ author: { id: 'user', bot: false }, guild });
            assert.ok(db.prepare('SELECT xp FROM levels').get().xp > 99);
            db.prepare('UPDATE levels SET xp = 99, level = 0').run();
            db.prepare('INSERT OR REPLACE INTO voice_sessions VALUES (?, ?, ?)').run('guild', 'user', Date.now() - 120000);
            await voice.execute({ guild, member, channelId: 'voice' }, { guild, member, channelId: null });
            assert.ok(db.prepare('SELECT xp FROM levels').get().xp > 99);
            assert.equal(sent.length, configured ? 2 : 0);
        }
    } finally { db.close(); }
});
