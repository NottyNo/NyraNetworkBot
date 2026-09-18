const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors: { embed: embedColor } } = require('../../config/colors.json');

function formatCategoryName(folder) {
    return folder
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands.'),
    async execute(interaction) {
        const commands = [...interaction.client.commands.values()];

        // Group commands by their category (folder name)
        const grouped = {};
        for (const command of commands) {
            const category = command.category ?? 'Uncategorized';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(command);
        }

        // Sort categories alphabetically, and commands within each category alphabetically
        const sortedCategories = Object.keys(grouped).sort();

        const embed = new EmbedBuilder()
            .setTitle('📖 Command List')
            .setColor(embedColor)
            .setDescription(`Showing all **${commands.length}** available commands.`);

        for (const category of sortedCategories) {
            const commandList = grouped[category]
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description || 'No description provided.'}`)
                .join('\n');

            embed.addFields({
                name: `${formatCategoryName(category)} (${grouped[category].length})`,
                value: commandList,
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};