const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config/statChannels.json');

const UPDATE_COOLDOWN_MS = 10 * 60 * 1000;
const lastUpdate = new Map();
const pendingUpdate = new Map();

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

    const categories = [...guild.channels.cache
        .filter((c) => c.type === ChannelType.GuildCategory)
        .values()]
        .sort((a, b) => a.rawPosition - b.rawPosition || (a.id > b.id ? 1 : -1));

    const ordered = [category, ...categories.filter((c) => c.id !== category.id)];
    const positions = ordered.map((c, index) => ({ channel: c.id, position: index }));

    try {
        await guild.channels.setPositions(positions);
    } catch (error) {
        console.error('Failed to move stats category to top:', error);
    }
}

async function setupStatChannels(guild) {
    const existing = db.prepare(`SELECT COUNT(*) AS count FROM stat_channels WHERE guildId = ?`).get(guild.id);
    if (existing.count > 0) return;

    const category = await guild.channels.create({
        name: config.categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.Connect],
                allow: [PermissionFlagsBits.ViewChannel],
            },
        ],
    });

    for (const def of config.channels) {
        const name = await buildName(def, guild);

        const channel = await guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.Connect],
                    allow: [PermissionFlagsBits.ViewChannel],
                },
            ],
        });

        db.prepare(`
            INSERT OR REPLACE INTO stat_channels (guildId, key, channelId)
            VALUES (?, ?, ?)
        `).run(guild.id, def.key, channel.id);
    }

    await moveCategoryToTop(category);
}

async function performUpdate(guild) {
    let category = null;

    for (const def of config.channels) {
        if (!def.dynamic) continue;

        const row = db.prepare(`
            SELECT channelId FROM stat_channels WHERE guildId = ? AND key = ?
        `).get(guild.id, def.key);

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

    lastUpdate.set(guild.id, Date.now());
}

function updateStatChannels(guild) {
    const last = lastUpdate.get(guild.id) ?? 0;
    const elapsed = Date.now() - last;

    if (elapsed >= UPDATE_COOLDOWN_MS) {
        performUpdate(guild);
        return;
    }

    if (pendingUpdate.has(guild.id)) return;

    const delay = UPDATE_COOLDOWN_MS - elapsed;
    const timer = setTimeout(() => {
        performUpdate(guild);
        pendingUpdate.delete(guild.id);
    }, delay);

    pendingUpdate.set(guild.id, timer);
}

async function forceUpdateStatChannels(guild) {
    await performUpdate(guild);
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
        });
    }

    const configKeys = config.channels.map((c) => c.key);

    for (const def of config.channels) {
        const row = db.prepare(`
            SELECT * FROM stat_channels WHERE guildId = ? AND key = ?
        `).get(guild.id, def.key);

        const desiredName = await buildName(def, guild);

        if (!row) {
            const channel = await guild.channels.create({
                name: desiredName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.Connect],
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

            db.prepare(`
                INSERT INTO stat_channels (guildId, key, channelId)
                VALUES (?, ?, ?)
            `).run(guild.id, def.key, channel.id);

            results.created.push(desiredName);
            continue;
        }

        const channel = guild.channels.cache.get(row.channelId);
        if (!channel) {
            const newChannel = await guild.channels.create({
                name: desiredName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.Connect],
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

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

            db.prepare(`
                DELETE FROM stat_channels WHERE guildId = ? AND key = ?
            `).run(guild.id, row.key);

            results.removed.push(row.key);
        }
    }

    await moveCategoryToTop(category);

    return results;
}

module.exports = { setupStatChannels, updateStatChannels, forceUpdateStatChannels, syncStatChannels };