const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');
const { askAI } = require('../../helpers/aiHelper.js');

module.exports = {
    name: 'ai',
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🧠 Bertanya atau mengobrol langsung dengan AI (Claude 3.5 Sonnet).')
        .addStringOption(option => 
            option.setName('pertanyaan')
                .setDescription('Apa yang ingin kamu tanyakan kepada Lunar?')
                .setRequired(true)
        ),

    // --------------------------------------------------
    // EKSEKUSI UNTUK SLASH COMMAND (/ai)
    // --------------------------------------------------
    async executeSlash(interaction, client) {
        const prompt = interaction.options.getString('pertanyaan');

        // Menunda balasan (deferReply) memberikan bot waktu hingga 15 menit untuk merespons
        // Sangat krusial untuk perintah yang memanggil API eksternal yang lambat
        await interaction.deferReply();

        try {
            // Memanggil fungsi Claude dari helper
            const answer = await askAI(prompt);

            // Discord membatasi deskripsi embed maksimal 4096 karakter
            // Jika jawaban AI terlalu panjang, kita potong agar bot tidak crash
            const safeAnswer = answer.length > 4000 ? answer.slice(0, 4000) + '\n\n... *(Teks dipotong karena batas karakter Discord)*' : answer;

            const aiEmbed = baseEmbed(
                '🧠 Jawaban AI (Claude)',
                safeAnswer,
                '#9b59b6' // Warna ungu khas AI / magis
            );

            // Karena kita menggunakan deferReply di awal, kita harus membalas dengan editReply
            await interaction.editReply({ embeds: [aiEmbed] });
        } catch (error) {
            console.error('[ERROR] Slash AI Command:', error);
            await interaction.editReply({ content: '❌ Terjadi gangguan pada sistem AI Lunar.' });
        }
    },

    // --------------------------------------------------
    // EKSEKUSI UNTUK PREFIX COMMAND (lunar!ai)
    // --------------------------------------------------
    async executePrefix(message, args, client) {
        // Menggabungkan semua kata setelah perintah menjadi satu kalimat utuh
        // Contoh: "lunar!ai ibukota jepang" -> args = ["ibukota", "jepang"] -> prompt = "ibukota jepang"
        const prompt = args.join(' ');

        // Jika member hanya mengetik "lunar!ai" tanpa pertanyaan
        if (!prompt) {
            const warn = warningEmbed(
                'Pertanyaan Kosong', 
                'Kamu harus memasukkan pertanyaan!\nContoh: `lunar!ai Siapa penemu lampu?`'
            );
            return message.reply({ embeds: [warn] });
        }

        // Mengirimkan pesan indikator "Sedang berpikir"
        const waitEmbed = baseEmbed('🧠 Memproses...', 'Lunar sedang memikirkan jawaban terbaik untukmu...', '#9b59b6');
        const waitMsg = await message.reply({ embeds: [waitEmbed] });

        try {
            // Memanggil fungsi Claude dari helper
            const answer = await askAI(prompt);

            const safeAnswer = answer.length > 4000 ? answer.slice(0, 4000) + '\n\n... *(Teks dipotong karena batas karakter Discord)*' : answer;

            const aiEmbed = baseEmbed(
                '🧠 Jawaban AI (Claude)',
                safeAnswer,
                '#9b59b6'
            );

            // Mengedit pesan "Memproses..." menjadi jawaban akhir
            await waitMsg.edit({ embeds: [aiEmbed] });
        } catch (error) {
            console.error('[ERROR] Prefix AI Command:', error);
            await waitMsg.edit({ content: '❌ Terjadi gangguan pada sistem AI Lunar.', embeds: [] });
        }
    }
};