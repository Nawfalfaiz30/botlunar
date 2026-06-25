const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');
const { generateJSON } = require('../../helpers/aiHelper.js');
const { readJSON, writeJSON } = require('../../helpers/utils.js');

module.exports = {
    name: 'quote',
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('💬 Dapatkan kutipan anime acak yang di-generate oleh AI dan simpan ke koleksimu!'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.processQuote(interaction, interaction.user, true);
    },

    async executePrefix(message, args, client) {
        const waitEmbed = baseEmbed('⏳ Mencari Kutipan...', 'AI sedang mengingat kutipan anime terbaik untukmu...', '#9b59b6');
        const waitMsg = await message.reply({ embeds: [waitEmbed] });
        await this.processQuote(message, message.author, false, waitMsg);
    },

    async processQuote(context, user, isSlash, waitMsg = null) {
        // Instruksi ketat ke Claude agar merespons HANYA dengan JSON
        const formatInstruction = 'Balas dengan format JSON persis seperti ini: {"quote": "isi kutipan bahasa indonesia", "character": "nama karakter", "anime": "judul anime"}';
        const promptText = 'Berikan satu kutipan anime yang epik, bijak, atau emosional secara acak.';

        const aiData = await generateJSON(formatInstruction, promptText);

        if (!aiData || !aiData.quote) {
            const errEmbed = warningEmbed('Gagal Mengingat', 'AI Lunar sedang kebingungan mencari kutipan. Silakan coba lagi!');
            return isSlash ? await context.editReply({ embeds: [errEmbed] }) : await waitMsg.edit({ embeds: [errEmbed] });
        }

        // Menyimpan hasil ke dalam collection.json
        const dbFile = 'collection.json';
        const collection = readJSON(dbFile);
        
        if (!collection[user.id]) collection[user.id] = { quotes: [], waifus: [] };
        
        // Memasukkan kutipan baru ke dalam array quotes milik user
        collection[user.id].quotes.push(`${aiData.quote} — *${aiData.character} (${aiData.anime})*`);
        writeJSON(dbFile, collection);

        // Menampilkan hasil
        const quoteEmbed = baseEmbed(
            '💬 Kutipan Anime (Gacha AI)',
            `*"${aiData.quote}"*\n\n— **${aiData.character}**\n📺 *${aiData.anime}*`,
            '#FEE75C'
        ).setFooter({ text: 'Kutipan ini telah ditambahkan ke koleksimu!' });

        return isSlash ? await context.editReply({ embeds: [quoteEmbed] }) : await waitMsg.edit({ embeds: [quoteEmbed] });
    }
};