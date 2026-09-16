const { Events, MessageFlags } = require('discord.js');
const db = require('../database/db');
const { checkRequirements, buildGiveawayEmbed } = require('../utils/giveaways');
const { colors: { embed: embedColor } } = require('../config/colors.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // --- Giveaway "Enter" button ---
        if (interaction.isButton() && interaction.customId.startsWith('giveaway_enter_')) {
            const giveawayId = parseInt(interaction.customId.replace('giveaway_enter_', ''), 10);
            const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId);

            if (!row || row.ended) {
                return interaction.reply({ content: 'This giveaway has ended.', flags: MessageFlags.Ephemeral });
            }

            const existingEntry = db.prepare(`
                SELECT 1 FROM giveaway_entries WHERE giveawayId = ? AND userId = ?
            `).get(giveawayId, interaction.user.id);

            if (existingEntry) {
                return interaction.reply({ content: 'You have already entered this giveaway!', flags: MessageFlags.Ephemeral });
            }

            const requirements = JSON.parse(row.requirements);
            const { eligible, failedReasons } = checkRequirements(interaction.guild, interaction.member, requirements);

            if (!eligible) {
                return interaction.reply({
                    content: `❌ You don't meet the requirements for this giveaway:\n${failedReasons.join('\n')}`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            db.prepare(`
                INSERT INTO giveaway_entries (giveawayId, userId, enteredAt) VALUES (?, ?, ?)
            `).run(giveawayId, interaction.user.id, Date.now());

            const embed = buildGiveawayEmbed(row, interaction.guild, embedColor, false);
            await interaction.message.edit({ embeds: [embed] }).catch(() => {});

            return interaction.reply({ content: '✅ You have entered the giveaway!', flags: MessageFlags.Ephemeral });
        }

        // --- Slash commands ---
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
            console.log(`Executed command: ${interaction.commandName} by ${interaction.user.tag}`);
        } catch (error) {
            console.error(error);

            const errorPayload = {
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            };

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload);
                } else {
                    await interaction.reply(errorPayload);
                }
            } catch (followUpError) {
                // Interaction token likely expired (3s timeout) before we could respond at all
                console.error('Failed to send error response to interaction:', followUpError);
            }
        }
    },
};