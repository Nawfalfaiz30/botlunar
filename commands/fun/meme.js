const { SlashCommandBuilder } = require('discord.js');
const { imageEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'meme',
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('😂 Mengambil meme lucu secara acak dari internet.'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.fetchMeme(interaction, true);
    },

    async executePrefix(message, args, client) {
        const waitMsg = await message.reply({ content: '⏳ *Sedang mencari meme segar...*' });
        await this.fetchMeme(message, false, waitMsg);
    },

    async fetchMeme(context, isSlash, waitMsg = null) {
        try {
            // Mengambil data dari public API meme
            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json();

            if (!data || !data.url) throw new Error('Meme tidak ditemukan');

            // Menggunakan cetakan imageEmbed yang sudah dibuat di helper
            const embed = imageEmbed(
                `😂 ${data.title}`,
                `Meme dari r/${data.subreddit} | 👍 ${data.ups} Upvotes`,
                data.url
            );

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('[ERROR MEME]', error);
            const errReply = errorEmbed('Gagal Memuat Meme', 'Internet sedang lambat atau sumber meme sedang gangguan.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};