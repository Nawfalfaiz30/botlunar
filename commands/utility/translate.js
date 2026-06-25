const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'translate',
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('🌍 Menerjemahkan teks ke bahasa lain.')
        .addStringOption(option => option.setName('bahasa').setDescription('Kode bahasa tujuan (Contoh: id, en, ja, ko)').setRequired(true))
        .addStringOption(option => option.setName('teks').setDescription('Teks yang ingin diterjemahkan').setRequired(true)),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const lang = interaction.options.getString('bahasa');
        const text = interaction.options.getString('teks');
        await this.processTranslation(interaction, lang, text, true);
    },

    async executePrefix(message, args, client) {
        const lang = args[0];
        const text = args.slice(1).join(' ');

        if (!lang || !text) {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `!translate [kode_bahasa] [teks]`\nContoh: `!translate id How are you?`')] });
        }
        
        const waitMsg = await message.reply('⏳ *Menerjemahkan teks...*');
        await this.processTranslation(message, lang, text, false, waitMsg);
    },

    async processTranslation(context, lang, text, isSlash, waitMsg = null) {
        try {
            // Menggunakan Google Translate API Endpoint (Tanpa Key)
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const json = await response.json();

            const translatedText = json[0][0][0];
            const detectedLang = json[2]; // Kode bahasa asli yang terdeteksi

            const embed = baseEmbed(
                '🌍 Penerjemah Lunar',
                `**Bahasa Asal (${detectedLang}):**\n\`\`\`${text}\`\`\`\n**Terjemahan (${lang}):**\n\`\`\`${translatedText}\`\`\``,
                '#1ABC9C'
            );

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('[ERROR TRANSLATE]', error);
            const err = errorEmbed('Gagal Menerjemahkan', 'Pastikan kode bahasa valid (id = Indonesia, en = Inggris, ja = Jepang).');
            return isSlash ? await context.editReply({ embeds: [err] }) : await waitMsg.edit({ content: null, embeds: [err] });
        }
    }
};