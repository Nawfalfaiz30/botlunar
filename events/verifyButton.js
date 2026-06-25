const { Events } = require('discord.js');
const { successEmbed, errorEmbed } = require('../helpers/embed.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    
    async execute(interaction, client) {
        // Hanya memproses interaksi jika itu adalah klik tombol
        if (!interaction.isButton()) return;

        // Mengecek apakah tombol yang ditekan adalah tombol verifikasi dari Lunar
        if (interaction.customId.startsWith('verify_role_')) {
            // Memisahkan string untuk mengambil ID Role (Format: verify_role_123456789)
            const roleId = interaction.customId.replace('verify_role_', '');
            
            try {
                // Mengecek apakah member sudah memiliki role tersebut
                if (interaction.member.roles.cache.has(roleId)) {
                    return interaction.reply({ content: 'Kamu sudah diverifikasi sebelumnya!', ephemeral: true });
                }

                // Memberikan role ke member
                await interaction.member.roles.add(roleId);

                const successReply = successEmbed('Verifikasi Berhasil! ✅', 'Terima kasih! Akses server kamu telah dibuka. Selamat bersosialisasi!');
                return interaction.reply({ embeds: [successReply], ephemeral: true }); // Ephemeral = hanya bisa dilihat oleh penekan tombol

            } catch (error) {
                console.error('[ERROR VERIFY BUTTON]', error);
                const errReply = errorEmbed('Gagal Memverifikasi', 'Terjadi kesalahan sistem. Pastikan Role Bot Lunar berada di atas Role Verifikasi pada pengaturan server.');
                return interaction.reply({ embeds: [errReply], ephemeral: true });
            }
        }
    }
};