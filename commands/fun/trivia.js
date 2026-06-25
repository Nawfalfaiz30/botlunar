const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { generateJSON } = require('../../helpers/aiHelper.js');
const { addKoin } = require('../../helpers/economyHelper.js');

module.exports = {
    name: 'trivia',
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('🧠 Mainkan kuis trivia AI dan menangkan hadiah koin!'),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.playTrivia(interaction, interaction.user, interaction.channel, true);
    },

    async executePrefix(message, args, client) {
        const waitEmbed = baseEmbed('⏳ Menyiapkan Kuis...', 'AI sedang memikirkan pertanyaan yang menantang...', '#9b59b6');
        const waitMsg = await message.reply({ embeds: [waitEmbed] });
        await this.playTrivia(message, message.author, message.channel, false, waitMsg);
    },

    async playTrivia(context, user, channel, isSlash, waitMsg = null) {
        // Meminta AI membuat soal dalam format JSON yang presisi
        const formatInstruction = 'Balas HANYA dengan format JSON: {"pertanyaan": "teks pertanyaan", "A": "pilihan A", "B": "pilihan B", "C": "pilihan C", "D": "pilihan D", "jawaban": "A/B/C/D (pilih salah satu hurufnya saja)"}';
        const promptText = 'Buat satu pertanyaan trivia acak tingkat menengah (bisa tentang pengetahuan umum, sains, sejarah, atau game).';

        const aiData = await generateJSON(formatInstruction, promptText);

        if (!aiData || !aiData.pertanyaan || !aiData.jawaban) {
            const errEmbed = warningEmbed('Gagal Memuat Kuis', 'AI sedang kebingungan menyusun soal. Coba lagi!');
            return isSlash ? await context.editReply({ embeds: [errEmbed] }) : await waitMsg.edit({ embeds: [errEmbed] });
        }

        const questionEmbed = baseEmbed(
            '🧠 Kuis Trivia AI',
            `**Pertanyaan:**\n${aiData.pertanyaan}\n\n**A.** ${aiData.A}\n**B.** ${aiData.B}\n**C.** ${aiData.C}\n**D.** ${aiData.D}\n\n⏳ *Ketik jawabanmu (A, B, C, atau D) di chat dalam waktu 15 detik!*`,
            '#3498db' // Biru kuis
        );

        if (isSlash) {
            await context.editReply({ embeds: [questionEmbed] });
        } else {
            await waitMsg.edit({ embeds: [questionEmbed] });
        }

        // Setup filter: Hanya tangkap pesan dari user yang memulai command, dan hanya satu huruf
        const filter = m => m.author.id === user.id && ['A', 'B', 'C', 'D'].includes(m.content.toUpperCase());
        
        // Membuat collector dengan batas waktu 15000 ms (15 detik) dan maksimal 1 jawaban
        const collector = channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', m => {
            if (m.content.toUpperCase() === aiData.jawaban.toUpperCase()) {
                const reward = 100;
                addKoin(user.id, reward);
                const winEmbed = successEmbed('Tebakan Benar! 🎉', `Tepat sekali! Jawabannya adalah **${aiData.jawaban}**. Kamu mendapatkan **${reward} Koin**.`);
                m.reply({ embeds: [winEmbed] });
            } else {
                const loseEmbed = errorEmbed('Salah! ❌', `Sayang sekali, tebakanmu salah. Jawaban yang benar adalah **${aiData.jawaban}**.`);
                m.reply({ embeds: [loseEmbed] });
            }
        });

        collector.on('end', collected => {
            // Jika waktu habis dan tidak ada jawaban yang dikumpulkan
            if (collected.size === 0) {
                const timeoutEmbed = warningEmbed('Waktu Habis! ⏱️', `Kamu terlalu lama berpikir! Jawaban yang benar adalah **${aiData.jawaban}**.`);
                channel.send({ content: `<@${user.id}>`, embeds: [timeoutEmbed] });
            }
        });
    }
};