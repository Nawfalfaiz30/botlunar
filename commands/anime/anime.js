const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'anime',
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('🎌 Mencari informasi detail tentang sebuah anime.')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul anime yang ingin dicari')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const query = interaction.options.getString('judul');
        await this.searchAnime(interaction, query, true);
    },

    async executePrefix(message, args, client) {
        const query = args.join(' ');
        if (!query) {
            return message.reply({ embeds: [warningEmbed('Judul Kosong', 'Masukkan judul anime!\nContoh: `!anime Naruto`')] });
        }
        const waitMsg = await message.reply('⏳ *Mencari data anime...*');
        await this.searchAnime(message, query, false, waitMsg);
    },

    async searchAnime(context, query, isSlash, waitMsg = null) {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                const errReply = errorEmbed('Tidak Ditemukan', `Anime dengan judul **${query}** tidak ditemukan di database MyAnimeList.`);
                return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
            }

            const anime = json.data[0];
            const synopsis = anime.synopsis ? (anime.synopsis.length > 500 ? anime.synopsis.substring(0, 500) + '...' : anime.synopsis) : 'Tidak ada sinopsis.';

            const embed = baseEmbed(
                `📺 ${anime.title}`,
                `**Judul Jepang:** ${anime.title_japanese || '-'}\n\n**Sinopsis:**\n${synopsis}`,
                '#3498db'
            )
            .addFields(
                { name: '⭐ Skor', value: `${anime.score || 'N/A'}`, inline: true },
                { name: '🎬 Episode', value: `${anime.episodes || 'Ongoing'}`, inline: true },
                { name: '📅 Status', value: `${anime.status}`, inline: true }
            )
            .setImage(anime.images.jpg.large_image_url)
            .setFooter({ text: 'Powered by Jikan API (MyAnimeList)' });

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[ERROR ANIME]', error);
            const errReply = errorEmbed('Gangguan API', 'Tidak dapat menghubungi server MyAnimeList saat ini.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};