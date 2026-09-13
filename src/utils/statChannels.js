const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config/statChannels.json');

const UPDATE_COOLDOWN_MS = 10 * 60 * 1000; // Discord rate-limits channel renames; don't go faster than this
const lastUpdate = new Map(); // guildId -> timestamp
const pendingUpdate = new Map(); // guildId -> Timeout

function buildName(def, guild) {
    if (!def.dynamic) return def.name;

    if (def.key === 'memberCount') {
        return def.template.replace('{count}', guild.memberCount);
    }
    if (def.key === 'botCount') {
        const botCount = guild.members.cache.filter((m) => m.user.bot).size;
        return def.template.replace('{count}', botCount);
    }

    return def.template;
}

async function setupStatChannels(guild) {
    // Skip if already set up for this guild
    const existing = db.prepare(`SELECT COUNT(*) AS count FROM stat_channels WHERE guildId = ?`).get(guild.id);
    if (existing.count > 0) return;

    const category = await guild.channels.create({
        name: config.categoryName,
        type: ChannelType.GuildCategory,
        position: 0,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.Connect],
                allow: [PermissionFlagsBits.ViewChannel],
            },
        ],
    });

    for (const def of config.channels) {
        const name = buildName(def, guild);

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

    // Push the category above all other categories
    await category.setPosition(0).catch(() => {});
}

async function performUpdate(guild) {
    for (const def of config.channels) {
        if (!def.dynamic) continue;

        const row = db.prepare(`
            SELECT channelId FROM stat_channels WHERE guildId = ? AND key = ?
        `).get(guild.id, def.key);

        if (!row) continue;

        const channel = guild.channels.cache.get(row.channelId);
        if (!channel) continue;

        const newName = buildName(def, guild);
        if (channel.name !== newName) {
            await channel.setName(newName).catch(() => {});
        }
    }

    lastUpdate.set(guild.id, Date.now());
}

// Debounced update: respects the cooldown, queues a trailing update if called too soon
function updateStatChannels(guild) {
    const last = lastUpdate.get(guild.id) ?? 0;
    const elapsed = Date.now() - last;

    if (elapsed >= UPDATE_COOLDOWN_MS) {
        performUpdate(guild);
        return;
    }

    // Already have a pending update queued? don't stack more
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

    // Find or create the category
    let category = null;
    const existingRows = db.prepare(`SELECT * FROM stat_channels WHERE guildId = ?`).all(guild.id);

    // Try to find category from an existing channel's parent
    if (existingRows.length > 0) {
        const sampleChannel = guild.channels.cache.get(existingRows[0].channelId);
        category = sampleChannel?.parent ?? null;
    }

    if (!category) {
        category = await guild.channels.create({
            name: config.categoryName,
            type: ChannelType.GuildCategory,
            position: 0,
        });
    }

    const configKeys = config.channels.map((c) => c.key);

    // --- Create or rename channels based on current config ---
    for (const def of config.channels) {
        const row = db.prepare(`
            SELECT * FROM stat_channels WHERE guildId = ? AND key = ?
        `).get(guild.id, def.key);

        const desiredName = buildName(def, guild);

        if (!row) {
            // Doesn't exist yet — create it
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

        // Exists — check if the channel still exists on Discord's side
        const channel = guild.channels.cache.get(row.channelId);
        if (!channel) {
            // Channel was deleted manually on Discord; recreate it
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

        // Rename if the name in config no longer matches
        if (channel.name !== desiredName) {
            await channel.setName(desiredName).catch(() => {});
            results.renamed.push(desiredName);
        }
    }

    // --- Remove channels whose keys no longer exist in the config ---
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

    return results;
}
module.exports = { setupStatChannels, updateStatChannels, forceUpdateStatChannels, syncStatChannels };