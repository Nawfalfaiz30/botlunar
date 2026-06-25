const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'manga',
    data: new SlashCommandBuilder()
        .setName('manga')
        .setDescription('📖 Mencari informasi detail tentang sebuah manga.')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul manga yang ingin dicari')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const query = interaction.options.getString('judul');
        await this.searchManga(interaction, query, true);
    },

    async executePrefix(message, args, client) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [warningEmbed('Judul Kosong', 'Masukkan judul manga!')] });
        
        const waitMsg = await message.reply('⏳ *Mencari data manga...*');
        await this.searchManga(message, query, false, waitMsg);
    },

    async searchManga(context, query, isSlash, waitMsg = null) {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`);
            const json = await response.json();

            if (!json.data || json.data.length === 0) {
                const errReply = errorEmbed('Tidak Ditemukan', `Manga dengan judul **${query}** tidak ditemukan.`);
                return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
            }

            const manga = json.data[0];
            const synopsis = manga.synopsis ? (manga.synopsis.length > 500 ? manga.synopsis.substring(0, 500) + '...' : manga.synopsis) : 'Tidak ada sinopsis.';

            const embed = baseEmbed(
                `📖 ${manga.title}`,
                `**Judul Jepang:** ${manga.title_japanese || '-'}\n\n**Sinopsis:**\n${synopsis}`,
                '#1abc9c' // Tosca
            )
            .addFields(
                { name: '⭐ Skor', value: `${manga.score || 'N/A'}`, inline: true },
                { name: '📚 Chapter', value: `${manga.chapters || 'Ongoing'}`, inline: true },
                { name: '📅 Status', value: `${manga.status}`, inline: true }
            )
            .setImage(manga.images.jpg.large_image_url)
            .setFooter({ text: 'Powered by Jikan API' });

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[ERROR MANGA]', error);
            const errReply = errorEmbed('Gangguan API', 'Tidak dapat menghubungi server MyAnimeList saat ini.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};