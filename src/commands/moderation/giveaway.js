const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');
const db = require('../../database/db');
const { colors: { embed: embedColor } } = require('../../config/colors.json');
const {
    parseDuration,
    buildRequirements,
    buildGiveawayEmbed,
    buildGiveawayComponents,
    endGiveaway,
    pickWinners,
} = require('../../utils/giveaways');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Start a new giveaway.')
                .addStringOption((o) => o.setName('prize').setDescription('What is being given away').setRequired(true))
                .addStringOption((o) => o.setName('duration').setDescription('e.g. 1d, 12h, 30m').setRequired(true))
                .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners').setMinValue(1))
                .addRoleOption((o) => o.setName('role').setDescription('Required role (optional)'))
                .addIntegerOption((o) => o.setName('min_level').setDescription('Minimum level required (optional)').setMinValue(1))
                .addIntegerOption((o) => o.setName('min_messages_today').setDescription('Minimum messages sent today (optional)').setMinValue(1))
                .addIntegerOption((o) => o.setName('min_account_age_days').setDescription('Minimum Discord account age in days (optional)').setMinValue(1))
                .addIntegerOption((o) => o.setName('min_server_age_days').setDescription('Minimum time in this server, in days (optional)').setMinValue(1))
        )
        .addSubcommand((sub) =>
            sub
                .setName('end')
                .setDescription('End a giveaway early.')
                .addIntegerOption((o) => o.setName('giveaway_id').setDescription('The giveaway ID').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('reroll')
                .setDescription('Reroll winners for an ended giveaway.')
                .addIntegerOption((o) => o.setName('giveaway_id').setDescription('The giveaway ID').setRequired(true))
                .addIntegerOption((o) => o.setName('count').setDescription('How many new winners to pick').setMinValue(1))
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('List active giveaways in this server.')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            const prize = interaction.options.getString('prize');
            const durationStr = interaction.options.getString('duration');
            const winnerCount = interaction.options.getInteger('winners') ?? 1;

            const durationMs = parseDuration(durationStr);
            if (!durationMs || durationMs < 10000) {
                return interaction.reply({
                    content: 'Invalid duration. Use a format like `1d`, `12h`, `30m`, or `1d12h`.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const requirements = buildRequirements({
                role: interaction.options.getRole('role'),
                minLevel: interaction.options.getInteger('min_level'),
                minMessagesToday: interaction.options.getInteger('min_messages_today'),
                minAccountAgeDays: interaction.options.getInteger('min_account_age_days'),
                minServerAgeDays: interaction.options.getInteger('min_server_age_days'),
            });

            const endTime = Date.now() + durationMs;

            const result = db.prepare(`
                INSERT INTO giveaways (guildId, channelId, hostId, prize, winnerCount, requirements, endTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(interaction.guild.id, interaction.channel.id, interaction.user.id, prize, winnerCount, JSON.stringify(requirements), endTime);

            const giveawayId = result.lastInsertRowid;
            const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId);

            const embed = buildGiveawayEmbed(row, interaction.guild, embedColor, false);
            const components = buildGiveawayComponents(giveawayId, false);

            const message = await interaction.channel.send({ embeds: [embed], components });

            db.prepare(`UPDATE giveaways SET messageId = ? WHERE id = ?`).run(message.id, giveawayId);

            return interaction.reply({
                content: `✅ Giveaway **#${giveawayId}** created for **${prize}**.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (sub === 'end') {
            const giveawayId = interaction.options.getInteger('giveaway_id');
            const row = db.prepare(`SELECT * FROM giveaways WHERE id = ? AND guildId = ?`).get(giveawayId, interaction.guild.id);

            if (!row) {
                return interaction.reply({ content: 'Giveaway not found.', flags: MessageFlags.Ephemeral });
            }
            if (row.ended) {
                return interaction.reply({ content: 'That giveaway has already ended.', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await endGiveaway(interaction.client, row);
            return interaction.editReply(`✅ Giveaway **#${giveawayId}** ended.`);
        }

        if (sub === 'reroll') {
            const giveawayId = interaction.options.getInteger('giveaway_id');
            const count = interaction.options.getInteger('count');
            const row = db.prepare(`SELECT * FROM giveaways WHERE id = ? AND guildId = ?`).get(giveawayId, interaction.guild.id);

            if (!row || !row.ended) {
                return interaction.reply({ content: 'That giveaway does not exist or has not ended yet.', flags: MessageFlags.Ephemeral });
            }

            const entries = db.prepare(`SELECT userId FROM giveaway_entries WHERE giveawayId = ?`).all(giveawayId)
                .map((e) => e.userId);
            const previousWinners = JSON.parse(row.winners);
            const newWinners = pickWinners(entries, count ?? row.winnerCount, previousWinners);

            db.prepare(`UPDATE giveaways SET winners = ? WHERE id = ?`).run(JSON.stringify(newWinners), giveawayId);

            if (newWinners.length === 0) {
                return interaction.reply({ content: 'No eligible entries left to reroll from.', flags: MessageFlags.Ephemeral });
            }

            await interaction.channel.send(
                `🎉 New winner(s) for **${row.prize}**: ${newWinners.map((id) => `<@${id}>`).join(', ')}!`
            );
            return interaction.reply({ content: '✅ Rerolled.', flags: MessageFlags.Ephemeral });
        }

        if (sub === 'list') {
            const rows = db.prepare(`
                SELECT * FROM giveaways WHERE guildId = ? AND ended = 0 ORDER BY endTime ASC
            `).all(interaction.guild.id);

            if (rows.length === 0) {
                return interaction.reply({ content: 'No active giveaways.', flags: MessageFlags.Ephemeral });
            }

            const list = rows.map((r) =>
                `**#${r.id}** — ${r.prize} — ends <t:${Math.floor(r.endTime / 1000)}:R>`
            ).join('\n');

            return interaction.reply({ content: list, flags: MessageFlags.Ephemeral });
        }
    },
};