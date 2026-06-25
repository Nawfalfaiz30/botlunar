const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'episodetracker',
    data: new SlashCommandBuilder()
        .setName('episodetracker')
        .setDescription('📊 Mengecek status rilis episode dari sebuah anime.')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul anime')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const query = interaction.options.getString('judul');
        await this.trackEpisode(interaction, query, true);
    },

    async executePrefix(message, args, client) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [warningEmbed('Judul Kosong', 'Masukkan judul anime!')] });
        
        const waitMsg = await message.reply('⏳ *Mencari data episode...*');
        await this.trackEpisode(message, query, false, waitMsg);
    },

    async trackEpisode(context, query, isSlash, waitMsg = null) {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                const errReply = errorEmbed('Tidak Ditemukan', 'Anime tidak ditemukan.');
                return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
            }

            const anime = json.data[0];
            const broadcast = anime.broadcast.string ? anime.broadcast.string : 'Jadwal tidak diketahui';

            const embed = baseEmbed(
                `📊 Info Rilis: ${anime.title}`,
                `**Status:** ${anime.status}\n**Total Episode:** ${anime.episodes || 'Belum Ditetapkan'}\n**Jadwal Tayang:** ${broadcast}`,
                '#9b59b6'
            ).setThumbnail(anime.images.jpg.image_url);

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[ERROR EPISODE TRACKER]', error);
            const errReply = errorEmbed('Gangguan API', 'Gagal memuat tracker.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};