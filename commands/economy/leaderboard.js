const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'leaderboard',
    aliases: ['lb'],
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('📋 Menampilkan 10 member dengan level tertinggi di server.'),

    async executeSlash(interaction) {
        await this.processLeaderboard(interaction, true);
    },

    async executePrefix(message) {
        await this.processLeaderboard(message, false);
    },

    async processLeaderboard(context, isSlash) {
        try {
            // 🟢 MENGAMBIL DATA DARI MONGODB
            // Kita sortir langsung dari database:
            // level: -1 (Descending/Tertinggi ke terendah)
            // xp: -1 (Jika level sama, XP tertinggi yang di atas)
            const top10 = await User.find({})
                .sort({ level: -1, xp: -1 })
                .limit(10);

            // Jika database masih kosong
            if (top10.length === 0) {
                return context.reply({ 
                    content: 'Belum ada data member yang bisa ditampilkan di papan peringkat.', 
                    ephemeral: true 
                });
            }

            let leaderboardText = '';

            // Looping untuk membuat daftar teks
            top10.forEach((u, index) => {
                let medal;
                if (index === 0) medal = '🥇';
                else if (index === 1) medal = '🥈';
                else if (index === 2) medal = '🥉';
                else medal = `**#${index + 1}**`;

                // MongoDB menyimpan ID sebagai userId
                leaderboardText += `${medal} <@${u.userId}> — **Level ${u.level}** (${u.xp} XP)\n\n`;
            });

            // Menyatukan hasil teks ke dalam embed
            const embed = baseEmbed(
                '📋 Papan Peringkat Server (Top 10)',
                leaderboardText
            );

            return context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR LEADERBOARD MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan saat memuat leaderboard.', ephemeral: true });
        }
    }
};