const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');

module.exports = {
    // Nama perintah (Wajib ada karena dicari oleh index.js)
    name: 'ping',
    
    // Data untuk mendaftarkan Slash Command ke Discord API
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Mengecek kecepatan respons (latensi) Bot Lunar.'),

    // --------------------------------------------------
    // EKSEKUSI UNTUK SLASH COMMAND (/ping)
    // --------------------------------------------------
    async executeSlash(interaction, client) {
        // Membuat embed sementara saat bot sedang menghitung waktu
        const waitEmbed = baseEmbed('🏓 Pinging...', 'Mengukur kecepatan sinyal...');
        
        // Mengirim balasan sementara dan mengambil data pesannya (fetchReply: true)
        const sent = await interaction.reply({ embeds: [waitEmbed], fetchReply: true });
        
        // Menghitung selisih waktu antara pesan dikirim oleh user dan diterima oleh bot
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        // Membuat embed hasil akhir
        const resultEmbed = baseEmbed(
            '🏓 Pong!', 
            `**📡 Latensi Bot:** \`${latency}ms\`\n**⚙️ Latensi API Discord:** \`${apiLatency}ms\``,
            '#57F287' // Menggunakan warna hijau agar terlihat sukses
        );

        // Memperbarui pesan sementara menjadi pesan hasil akhir
        await interaction.editReply({ embeds: [resultEmbed] });
    },

    // --------------------------------------------------
    // EKSEKUSI UNTUK PREFIX COMMAND (lunar!ping)
    // --------------------------------------------------
    async executePrefix(message, args, client) {
        // Membuat embed sementara
        const waitEmbed = baseEmbed('🏓 Pinging...', 'Mengukur kecepatan sinyal...');
        
        // Mengirim pesan sementara sebagai balasan ke user
        const sent = await message.reply({ embeds: [waitEmbed] });
        
        // Menghitung selisih waktu
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        // Membuat embed hasil akhir
        const resultEmbed = baseEmbed(
            '🏓 Pong!', 
            `**📡 Latensi Bot:** \`${latency}ms\`\n**⚙️ Latensi API Discord:** \`${apiLatency}ms\``,
            '#57F287' 
        );

        // Memperbarui (edit) pesan yang sudah dikirim tadi
        await sent.edit({ embeds: [resultEmbed] });
    }
};