const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'animenews',
    data: new SlashCommandBuilder()
        .setName('animenews')
        .setDescription('📰 Melihat 5 daftar anime terpopuler yang sedang tayang musim ini.'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.fetchNews(interaction, true);
    },

    async executePrefix(message, args, client) {
        const waitMsg = await message.reply('⏳ *Mengambil data musim ini...*');
        await this.fetchNews(message, false, waitMsg);
    },

    async fetchNews(context, isSlash, waitMsg = null) {
        try {
            const response = await fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=5');
            const json = await response.json();

            if (!json.data || json.data.length === 0) throw new Error('Data kosong');

            let newsText = '';
            json.data.forEach((anime, index) => {
                newsText += `**${index + 1}. [${anime.title}](${anime.url})**\n`;
                newsText += `⭐ Skor: ${anime.score} | 🎬 Episode: ${anime.episodes || 'Ongoing'}\n\n`;
            });

            const embed = baseEmbed(
                '📰 Top Anime Sedang Tayang',
                `Berikut adalah 5 anime terpopuler yang sedang rilis musim ini:\n\n${newsText}`,
                '#E67E22' // Oranye
            ).setFooter({ text: 'Powered by Jikan API (MyAnimeList)' });

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[ERROR ANIME NEWS]', error);
            const errReply = errorEmbed('Gangguan API', 'Tidak dapat memuat daftar anime musim ini.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};