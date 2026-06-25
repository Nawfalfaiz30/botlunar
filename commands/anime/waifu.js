const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');
const { generateJSON } = require('../../helpers/aiHelper.js');
const { readJSON, writeJSON } = require('../../helpers/utils.js');

module.exports = {
    name: 'waifu',
    data: new SlashCommandBuilder()
        .setName('waifu')
        .setDescription('🌸 Gacha karakter waifu acak dari AI dan tambahkan ke harem/koleksimu!'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.processWaifu(interaction, interaction.user, true);
    },

    async executePrefix(message, args, client) {
        const waitEmbed = baseEmbed('⏳ Menarik Gacha...', 'AI sedang mencari karakter waifu yang cocok untukmu...', '#EB459E');
        const waitMsg = await message.reply({ embeds: [waitEmbed] });
        await this.processWaifu(message, message.author, false, waitMsg);
    },

    async processWaifu(context, user, isSlash, waitMsg = null) {
        // Instruksi format JSON untuk AI
        const formatInstruction = 'Balas dengan format JSON persis seperti ini: {"name": "nama karakter", "anime": "judul anime", "description": "deskripsi singkat karakter"}';
        const promptText = 'Pilih satu karakter anime perempuan (waifu) secara acak dan acak dari berbagai anime populer atau klasik.';

        const aiData = await generateJSON(formatInstruction, promptText);

        if (!aiData || !aiData.name) {
            const errEmbed = warningEmbed('Gacha Gagal', 'Sistem gacha sedang error. Silakan coba tarik (pull) lagi!');
            return isSlash ? await context.editReply({ embeds: [errEmbed] }) : await waitMsg.edit({ embeds: [errEmbed] });
        }

        // Menyimpan hasil ke database koleksi
        const dbFile = 'collection.json';
        const collection = readJSON(dbFile);
        
        if (!collection[user.id]) collection[user.id] = { quotes: [], waifus: [] };
        
        // Mencegah duplikasi jika member mendapatkan waifu yang sama
        const waifuEntry = `**${aiData.name}** (*${aiData.anime}*)`;
        let isDuplicate = false;

        if (collection[user.id].waifus.includes(waifuEntry)) {
            isDuplicate = true;
        } else {
            collection[user.id].waifus.push(waifuEntry);
            writeJSON(dbFile, collection);
        }

        const footerText = isDuplicate 
            ? '⚠️ Karakter ini sudah ada di dalam koleksimu.' 
            : '✨ Karakter ini berhasil ditambahkan ke koleksimu!';

        // Menampilkan hasil Gacha
        const waifuEmbed = baseEmbed(
            `🌸 Gacha Waifu: ${aiData.name}`,
            `**Asal Anime:** ${aiData.anime}\n\n**Deskripsi:**\n${aiData.description}`,
            '#EB459E' // Warna pink khas waifu
        ).setFooter({ text: footerText });

        return isSlash ? await context.editReply({ embeds: [waifuEmbed] }) : await waitMsg.edit({ embeds: [waifuEmbed] });
    }
};