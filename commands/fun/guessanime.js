const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { generateJSON } = require('../../helpers/aiHelper.js');
const { addKoin } = require('../../helpers/economyHelper.js');

module.exports = {
    name: 'guessanime',
    data: new SlashCommandBuilder()
        .setName('guessanime')
        .setDescription('🎌 Tebak judul anime berdasarkan petunjuk emoji dari AI!'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.playGuess(interaction, interaction.user, interaction.channel, true);
    },

    async executePrefix(message, args, client) {
        const waitEmbed = baseEmbed('⏳ Merakit Emoji...', 'AI sedang memilih anime populer dan menyusun emojinya...', '#EB459E');
        const waitMsg = await message.reply({ embeds: [waitEmbed] });
        await this.playGuess(message, message.author, message.channel, false, waitMsg);
    },

    async playGuess(context, user, channel, isSlash, waitMsg = null) {
        // Meminta AI membuat soal emoji dalam format JSON
        const formatInstruction = 'Balas HANYA dengan format JSON: {"emoji": "3-5 emoji yang menceritakan sebuah anime populer", "judul": "Judul anime tersebut (singkat dan populer)"}';
        const promptText = 'Buat satu kuis tebak anime berdasarkan emoji. Gunakan anime yang sangat populer agar bisa ditebak.';

        const aiData = await generateJSON(formatInstruction, promptText);

        if (!aiData || !aiData.emoji || !aiData.judul) {
            const errEmbed = warningEmbed('Gagal Memuat Kuis', 'AI sedang kebingungan menyusun emoji. Coba lagi!');
            return isSlash ? await context.editReply({ embeds: [errEmbed] }) : await waitMsg.edit({ embeds: [errEmbed] });
        }

        const questionEmbed = baseEmbed(
            '🎌 Tebak Anime via Emoji',
            `**Petunjuk Emoji:**\n# ${aiData.emoji}\n\n⏳ *Ketik judul animenya di chat dalam waktu 20 detik!*`,
            '#EB459E' 
        );

        if (isSlash) {
            await context.editReply({ embeds: [questionEmbed] });
        } else {
            await waitMsg.edit({ embeds: [questionEmbed] });
        }

        // Setup filter: Tangkap pesan dari user yang memulai command
        const filter = m => m.author.id === user.id;
        
        // Membuat collector dengan batas waktu 20000 ms (20 detik) dan maksimal 1 jawaban
        const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });

        collector.on('collect', m => {
            // Mengubah input dan jawaban ke huruf kecil agar case-insensitive
            const userAnswer = m.content.toLowerCase();
            const correctAnswer = aiData.judul.toLowerCase();

            // Cek apakah jawaban user mengandung kata kunci dari judul asli (memaklumi typo ringan)
            if (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) {
                const reward = 150;
                addKoin(user.id, reward);
                const winEmbed = successEmbed('Wibu Sejati! 🎉', `Tebakanmu benar! Judul animenya adalah **${aiData.judul}**. Kamu mendapatkan **${reward} Koin**.`);
                m.reply({ embeds: [winEmbed] });
            } else {
                const loseEmbed = errorEmbed('Salah! ❌', `Bukan itu animenya! Jawaban yang benar adalah **${aiData.judul}**.`);
                m.reply({ embeds: [loseEmbed] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = warningEmbed('Waktu Habis! ⏱️', `Kamu belum bisa menebaknya! Animenya adalah **${aiData.judul}**.`);
                channel.send({ content: `<@${user.id}>`, embeds: [timeoutEmbed] });
            }
        });
    }
};