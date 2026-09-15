const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription("Remove a user's warning(s).")
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to remove a warning from').setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('warn_id')
                .setDescription('The specific warning ID to remove (see /warnings). Omit to remove the most recent.')
                .setRequired(false)
        )
        .addBooleanOption((option) =>
            option
                .setName('all')
                .setDescription('Remove ALL matching warnings for this user instead of just one.')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('type')
                .setDescription('Only affect warnings of this type.')
                .setRequired(false)
                .addChoices(
                    { name: 'Manual (/warn)', value: 'manual' },
                    { name: 'Automod: Spam', value: 'spam' },
                    { name: 'Automod: Banned Word', value: 'bannedword' },
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const warnId = interaction.options.getInteger('warn_id');
        const removeAll = interaction.options.getBoolean('all') ?? false;
        const type = interaction.options.getString('type');

        // --- Remove a specific warning by ID (type/all ignored, ID is exact) ---
        if (warnId !== null) {
            const warn = db.prepare(`
                SELECT * FROM warns WHERE id = ? AND guildId = ? AND userId = ?
            `).get(warnId, interaction.guild.id, target.id);

            if (!warn) {
                return interaction.reply({
                    content: `Couldn't find warning **#${warnId}** for ${target.tag}. Check the ID with /warnings.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            db.prepare(`DELETE FROM warns WHERE id = ?`).run(warnId);

            return interaction.reply({
                content: `Removed warning **#${warnId}** (${warn.reason}) from ${target.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // --- Remove all (optionally filtered by type) ---
        if (removeAll) {
            const result = type
                ? db.prepare(`
                    DELETE FROM warns WHERE guildId = ? AND userId = ? AND type = ?
                `).run(interaction.guild.id, target.id, type)
                : db.prepare(`
                    DELETE FROM warns WHERE guildId = ? AND userId = ?
                `).run(interaction.guild.id, target.id);

            if (result.changes === 0) {
                return interaction.reply({
                    content: type
                        ? `${target.tag} has no **${type}** warnings to remove.`
                        : `${target.tag} has no warnings to remove.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            return interaction.reply({
                content: type
                    ? `Removed all ${result.changes} **${type}** warning(s) from ${target.tag}.`
                    : `Removed all ${result.changes} warning(s) from ${target.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // --- No ID, not "all": remove the most recent warning (optionally filtered by type) ---
        const latest = type
            ? db.prepare(`
                SELECT * FROM warns WHERE guildId = ? AND userId = ? AND type = ? ORDER BY timestamp DESC LIMIT 1
            `).get(interaction.guild.id, target.id, type)
            : db.prepare(`
                SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC LIMIT 1
            `).get(interaction.guild.id, target.id);

        if (!latest) {
            return interaction.reply({
                content: type
                    ? `${target.tag} has no **${type}** warnings to remove.`
                    : `${target.tag} has no warnings to remove.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        db.prepare(`DELETE FROM warns WHERE id = ?`).run(latest.id);

        return interaction.reply({
            content: `Removed the most recent warning **#${latest.id}** (${latest.reason}) from ${target.tag}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};