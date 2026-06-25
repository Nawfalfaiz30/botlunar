const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { generateJSON } = require('../../helpers/aiHelper.js');

module.exports = {
    name: 'rekomen',
    data: new SlashCommandBuilder()
        .setName('rekomen')
        .setDescription('🤖 Meminta rekomendasi Anime/Game/Film secara acak dan cerdas dari AI.')
        .addStringOption(option => 
            option.setName('kategori')
                .setDescription('Pilih kategori yang ingin dicari')
                .setRequired(true)
                .addChoices(
                    { name: '📺 Anime', value: 'Anime' },
                    { name: '🎮 Video Game', value: 'Game' },
                    { name: '🎬 Film / Movie', value: 'Film' }
                )
        ),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const category = interaction.options.getString('kategori');
        await this.getRecommendation(interaction, category, true);
    },

    async executePrefix(message, args, client) {
        const categoryInput = args[0] ? args[0].toLowerCase() : null;
        let category = '';

        if (categoryInput === 'anime') category = 'Anime';
        else if (categoryInput === 'game') category = 'Game';
        else if (categoryInput === 'film' || categoryInput === 'movie') category = 'Film';
        else {
            return message.reply({ embeds: [warningEmbed('Kategori Salah', 'Pilih kategori yang valid: `anime`, `game`, atau `film`.\nContoh: `!rekomen anime`')] });
        }

        const waitMsg = await message.reply('⏳ *AI Lunar sedang memikirkan rekomendasi mahakarya terbaik untukmu...*');
        await this.getRecommendation(message, category, false, waitMsg);
    },

    async getRecommendation(context, category, isSlash, waitMsg = null) {
        try {
            const formatInstruction = 'Balas HANYA dengan format JSON: {"judul": "nama judul", "alasan": "1 kalimat kenapa harus ditonton/dimainkan", "genre": "genre produk"}';
            const promptText = `Berikan satu rekomendasi produk kategori ${category} terbaik yang legendaris atau sangat seru secara acak.`;

            const aiData = await generateJSON(formatInstruction, promptText);

            if (!aiData || !aiData.judul) {
                throw new Error('AI gagal merespons');
            }

            const embed = baseEmbed(
                `🤖 Rekomendasi ${category} Lunar`,
                `🎯 **Judul:** ${aiData.judul}\n🧬 **Genre:** ${aiData.genre}\n\n💡 **Alasan Rekomendasi:**\n${aiData.alasan}`,
                '#1ABC9C'
            );

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('[ERROR REKOMEN]', error);
            const err = errorEmbed('AI Kebingungan', 'Lunar gagal menghubungi server AI. Silakan coba sesaat lagi!');
            return isSlash ? await context.editReply({ embeds: [err] }) : await waitMsg.edit({ content: null, embeds: [err] });
        }
    }
};