const { errorEmbed } = require('../helpers/embed.js');
const Guild = require('../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'messageDelete',
    async execute(message, client) {
        // Skip jika bukan dari server atau jika pesan dari bot
        if (!message.guild || message.author?.bot) return;

        const content = (message.content || '').toLowerCase().trim();
        if (!content) return;

        try {
            // 🟢 MENGAMBIL DATA SERVER DARI MONGODB
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            if (!guildData) return;

            const badWords = guildData.badWords || [];
            
            // Cek apakah pesan mengandung kata terlarang (menggunakan batas kata \b agar lebih akurat)
            const triggeredWord = badWords.find(word => new RegExp(`\\b${word}\\b`, 'i').test(content));
            if (!triggeredWord) return;

            console.log(`🚨 AutoMod Log: ${message.author.tag} mengirim "${triggeredWord}" dan pesannya dihapus.`);

            // === 1. KIRIM PERINGATAN KE USER VIA DM ===
            try {
                const dmEmbed = errorEmbed(
                    '⚠️ Peringatan AutoMod',
                    `Kamu telah menulis kata yang dilarang: **\`${triggeredWord}\`** di server **${message.guild.name}**\n\n` +
                    'Pesanmu telah dihapus otomatis oleh sistem.'
                ).setFooter({ text: 'Jangan ulangi lagi.' });

                await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {
                // Abaikan jika user mengatur privasi DM menjadi tertutup
            }

            // === 2. KIRIM LOG KE LOG CHANNEL SERVER ===
            const logChannelId = guildData.logChannel;

            if (logChannelId) {
                const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const logEmbed = errorEmbed(
                        '🚨 Pelanggaran AutoMod Terdeteksi',
                        `**User:** ${message.author} (${message.author.id})\n` +
                        `**Channel:** ${message.channel}\n` +
                        `**Kata Terlarang:** \`${triggeredWord}\`\n` +
                        `**Pesan Asli:** ${message.content || '[Tidak bisa dibaca]'}\n`
                    );

                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }
        } catch (error) {
            console.error('[ERROR MESSAGE DELETE MONGODB]', error);
        }
    }
};