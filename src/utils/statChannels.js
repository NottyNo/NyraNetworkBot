const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config/statChannels.json');

const UPDATE_COOLDOWN_MS = 10 * 60 * 1000;
const lastUpdate = new Map();
const pendingUpdate = new Map();

function lockedOverwrites(guild) {
    return [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.Connect],
            allow: [PermissionFlagsBits.ViewChannel],
        },
    ];
}

async function buildName(def, guild) {
    if (!def.dynamic) return def.name;

    if (def.key === 'memberCount') {
        const count = guild.memberCount ?? 0;
        return def.template.replace('{count}', count);
    }
    if (def.key === 'botCount') {
        await guild.members.fetch();
        const botCount = guild.members.cache.filter((m) => m.user.bot).size;
        return def.template.replace('{count}', botCount);
    }

    return def.template;
}

async function moveCategoryToTop(category) {
    const guild = category.guild;

    const categories = [
        ...guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values(),
    ].sort((a, b) => a.rawPosition - b.rawPosition || (a.id > b.id ? 1 : -1));

    const ordered = [category, ...categories.filter((c) => c.id !== category.id)];
    const positions = ordered.map((c, index) => ({ channel: c.id, position: index }));

    try {
        await guild.channels.setPositions(positions);
    } catch (error) {
        console.error('Failed to move stats category to top:', error);
    }
}

function createStatChannel(guild, category, name) {
    return guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: lockedOverwrites(guild),
    });
}

async function setupStatChannels(guild) {
    const existing = db.prepare(`SELECT COUNT(*) AS count FROM stat_channels WHERE guildId = ?`).get(guild.id);
    if (existing.count > 0) return;

    const category = await guild.channels.create({
        name: config.categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: lockedOverwrites(guild),
    });

    for (const def of config.channels) {
        const name = await buildName(def, guild);
        const channel = await createStatChannel(guild, category, name);

        db.prepare(`
            INSERT OR REPLACE INTO stat_channels (guildId, key, channelId)
            VALUES (?, ?, ?)
        `).run(guild.id, def.key, channel.id);
    }

    await moveCategoryToTop(category);
}

async function performUpdate(guild) {
    // Mark the update as started right away so overlapping calls respect the cooldown
    lastUpdate.set(guild.id, Date.now());

    let category = null;

    for (const def of config.channels) {
        if (!def.dynamic) continue;

        const row = db
            .prepare(`SELECT channelId FROM stat_channels WHERE guildId = ? AND key = ?`)
            .get(guild.id, def.key);
        if (!row) continue;

        const channel = guild.channels.cache.get(row.channelId);
        if (!channel) continue;

        if (!category) category = channel.parent;

        const newName = await buildName(def, guild);
        if (channel.name !== newName) {
            await channel.setName(newName).catch(() => {});
        }
    }

    if (category) {
        await moveCategoryToTop(category);
    }
}

function runUpdate(guild) {
    return performUpdate(guild).catch((error) => {
        console.error(`Failed to update stat channels for guild ${guild.id}:`, error);
    });
}

function updateStatChannels(guild) {
    const elapsed = Date.now() - (lastUpdate.get(guild.id) ?? 0);

    if (elapsed >= UPDATE_COOLDOWN_MS) {
        runUpdate(guild);
        return;
    }

    if (pendingUpdate.has(guild.id)) return;

    const timer = setTimeout(() => {
        pendingUpdate.delete(guild.id);
        runUpdate(guild);
    }, UPDATE_COOLDOWN_MS - elapsed);

    pendingUpdate.set(guild.id, timer);
}

async function syncStatChannels(guild) {
    const results = { created: [], renamed: [], removed: [] };

    let category = null;
    const existingRows = db.prepare(`SELECT * FROM stat_channels WHERE guildId = ?`).all(guild.id);

    if (existingRows.length > 0) {
        const sampleChannel = guild.channels.cache.get(existingRows[0].channelId);
        category = sampleChannel?.parent ?? null;
    }

    if (!category) {
        category = await guild.channels.create({
            name: config.categoryName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: lockedOverwrites(guild),
        });
    }

    const configKeys = config.channels.map((c) => c.key);

    for (const def of config.channels) {
        const row = db
            .prepare(`SELECT * FROM stat_channels WHERE guildId = ? AND key = ?`)
            .get(guild.id, def.key);

        const desiredName = await buildName(def, guild);

        if (!row) {
            const channel = await createStatChannel(guild, category, desiredName);
            db.prepare(`
                INSERT INTO stat_channels (guildId, key, channelId) VALUES (?, ?, ?)
            `).run(guild.id, def.key, channel.id);

            results.created.push(desiredName);
            continue;
        }

        const channel = guild.channels.cache.get(row.channelId);
        if (!channel) {
            const newChannel = await createStatChannel(guild, category, desiredName);
            db.prepare(`
                UPDATE stat_channels SET channelId = ? WHERE guildId = ? AND key = ?
            `).run(newChannel.id, guild.id, def.key);

            results.created.push(desiredName);
            continue;
        }

        if (channel.name !== desiredName) {
            await channel.setName(desiredName).catch(() => {});
            results.renamed.push(desiredName);
        }
    }

    for (const row of existingRows) {
        if (!configKeys.includes(row.key)) {
            const channel = guild.channels.cache.get(row.channelId);
            if (channel) await channel.delete().catch(() => {});

            db.prepare(`DELETE FROM stat_channels WHERE guildId = ? AND key = ?`).run(guild.id, row.key);

            results.removed.push(row.key);
        }
    }

    await moveCategoryToTop(category);

    return results;
}

module.exports = { setupStatChannels, updateStatChannels, syncStatChannels };
