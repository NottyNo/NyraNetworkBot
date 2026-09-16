const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { xpForLevel } = require('./xp');

function parseDuration(input) {
    const regex = /(\d+)\s*(d|h|m|s)/gi;
    let match;
    let totalMs = 0;
    let matched = false;

    while ((match = regex.exec(input)) !== null) {
        matched = true;
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        totalMs += value * multipliers[unit];
    }

    return matched ? totalMs : null;
}

function buildRequirements(options) {
    const requirements = {};

    if (options.role) requirements.roleId = options.role.id;
    if (options.minLevel) requirements.minLevel = options.minLevel;
    if (options.minMessagesToday) requirements.minMessagesToday = options.minMessagesToday;
    if (options.minAccountAgeDays) requirements.minAccountAgeDays = options.minAccountAgeDays;
    if (options.minServerAgeDays) requirements.minServerAgeDays = options.minServerAgeDays;

    return requirements;
}

function formatRequirements(requirements, guild) {
    const lines = [];

    if (requirements.roleId) {
        lines.push(`• Must have role <@&${requirements.roleId}>`);
    }
    if (requirements.minLevel) {
        lines.push(`• Must be at least **Level ${requirements.minLevel}**`);
    }
    if (requirements.minMessagesToday) {
        lines.push(`• Must have sent **${requirements.minMessagesToday}+ messages today**`);
    }
    if (requirements.minAccountAgeDays) {
        lines.push(`• Account must be **${requirements.minAccountAgeDays}+ days old**`);
    }
    if (requirements.minServerAgeDays) {
        lines.push(`• Must have been in the server **${requirements.minServerAgeDays}+ days**`);
    }

    return lines.length ? lines.join('\n') : '*No requirements — anyone can enter!*';
}

function checkRequirements(guild, member, requirements) {
    const failedReasons = [];

    if (requirements.roleId && !member.roles.cache.has(requirements.roleId)) {
        failedReasons.push(`You need the <@&${requirements.roleId}> role.`);
    }

    if (requirements.minLevel) {
        const row = db.prepare(`SELECT level FROM levels WHERE guildId = ? AND userId = ?`).get(guild.id, member.id);
        const level = row?.level ?? 0;
        if (level < requirements.minLevel) {
            failedReasons.push(`You need to be at least Level ${requirements.minLevel} (you're Level ${level}).`);
        }
    }

    if (requirements.minMessagesToday) {
        const date = new Date().toISOString().slice(0, 10);
        const row = db.prepare(`
            SELECT count FROM daily_messages WHERE guildId = ? AND userId = ? AND date = ?
        `).get(guild.id, member.id, date);
        const count = row?.count ?? 0;
        if (count < requirements.minMessagesToday) {
            failedReasons.push(`You need to send ${requirements.minMessagesToday} messages today (you've sent ${count}).`);
        }
    }

    if (requirements.minAccountAgeDays) {
        const ageMs = Date.now() - member.user.createdTimestamp;
        const ageDays = ageMs / 86400000;
        if (ageDays < requirements.minAccountAgeDays) {
            failedReasons.push(`Your account needs to be at least ${requirements.minAccountAgeDays} days old.`);
        }
    }

    if (requirements.minServerAgeDays) {
        const ageMs = Date.now() - member.joinedTimestamp;
        const ageDays = ageMs / 86400000;
        if (ageDays < requirements.minServerAgeDays) {
            failedReasons.push(`You need to have been in this server for ${requirements.minServerAgeDays} days.`);
        }
    }

    return { eligible: failedReasons.length === 0, failedReasons };
}

function buildGiveawayComponents(giveawayId, ended = false) {
    const button = new ButtonBuilder()
        .setCustomId(`giveaway_enter_${giveawayId}`)
        .setLabel(ended ? 'Giveaway Ended' : '🎉 Enter Giveaway')
        .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(ended);

    return [new ActionRowBuilder().addComponents(button)];
}

function buildGiveawayEmbed(row, guild, embedColor, ended = false) {
    const requirements = JSON.parse(row.requirements);
    const entryCount = db.prepare(`
        SELECT COUNT(*) AS count FROM giveaway_entries WHERE giveawayId = ?
    `).get(row.id).count;

    const embed = new EmbedBuilder()
        .setTitle(ended ? `🎉 Giveaway Ended: ${row.prize}` : `🎉 Giveaway: ${row.prize}`)
        .setColor(embedColor)
        .addFields(
            { name: 'Winners', value: `${row.winnerCount}`, inline: true },
            { name: 'Entries', value: `${entryCount}`, inline: true },
            {
                name: ended ? 'Ends' : 'Ends',
                value: `<t:${Math.floor(row.endTime / 1000)}:R>`,
                inline: true,
            },
            { name: 'Requirements', value: formatRequirements(requirements, guild) },
        )
        .setFooter({ text: `Giveaway ID: ${row.id} • Hosted by` })
        .setTimestamp(row.endTime);

    if (ended) {
        const winners = JSON.parse(row.winners);
        embed.addFields({
            name: 'Winner(s)',
            value: winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'No valid entries.',
        });
    }

    return embed;
}

function pickWinners(entryUserIds, count, exclude = []) {
    const pool = entryUserIds.filter((id) => !exclude.includes(id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

async function endGiveaway(client, row) {
    db.prepare(`UPDATE giveaways SET ended = 1 WHERE id = ?`).run(row.id);

    const entries = db.prepare(`SELECT userId FROM giveaway_entries WHERE giveawayId = ?`).all(row.id)
        .map((e) => e.userId);

    const winnerIds = pickWinners(entries, row.winnerCount);
    db.prepare(`UPDATE giveaways SET winners = ? WHERE id = ?`).run(JSON.stringify(winnerIds), row.id);

    const updatedRow = { ...row, ended: 1, winners: JSON.stringify(winnerIds) };

    const channel = await client.channels.fetch(row.channelId).catch(() => null);
    if (!channel) return;

    const guild = channel.guild;
    const message = row.messageId ? await channel.messages.fetch(row.messageId).catch(() => null) : null;

    const embed = buildGiveawayEmbed(updatedRow, guild, 0x2ecc71, true);
    const components = buildGiveawayComponents(row.id, true);

    if (message) {
        await message.edit({ embeds: [embed], components }).catch(() => {});
    }

    if (winnerIds.length > 0) {
        await channel.send(
            `🎉 Congratulations ${winnerIds.map((id) => `<@${id}>`).join(', ')}! You won **${row.prize}**!`
        ).catch(() => {});
    } else {
        await channel.send(`😔 No valid entries for **${row.prize}** — no winner could be picked.`).catch(() => {});
    }
}

module.exports = {
    parseDuration,
    buildRequirements,
    formatRequirements,
    checkRequirements,
    buildGiveawayEmbed,
    buildGiveawayComponents,
    pickWinners,
    endGiveaway,
};