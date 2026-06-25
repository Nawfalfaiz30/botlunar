const { Events, PermissionsBitField } = require('discord.js');
const { warningEmbed } = require('../helpers/embed.js');
const Guild = require('../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: Events.MessageCreate,
    once: false,
    
    async execute(message, client) {
        // Abaikan pesan dari bot atau DM
        if (message.author.bot || !message.guild) return;

        try {
            // 🟢 MENGAMBIL DATA DARI MONGODB
            // Kita cari konfigurasi server ini saja, tidak perlu membaca seluruh file
            const guildSettings = await Guild.findOne({ guildId: message.guild.id });
            
            // Jika data server belum ada atau fitur antiLink mati, hentikan
            if (!guildSettings || !guildSettings.antiLink) return;

            // Pengecualian: Administrator atau staf yang bisa menghapus pesan diizinkan mengirim link
            if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

            // Regex (Pola pencarian) untuk mendeteksi URL / Link
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const discordInviteRegex = /(discord\.gg\/|discord\.com\/invite\/)[^\s]+/g;

            // Jika pesan mengandung link web atau link invite discord
            if (urlRegex.test(message.content) || discordInviteRegex.test(message.content)) {
                
                // Menghapus pesan berbahaya tersebut
                await message.delete().catch(err => console.log('Gagal hapus pesan link:', err));

                // Mengirimkan peringatan ke channel
                const warnMsg = warningEmbed(
                    'Link Terdeteksi 🛡️',
                    `<@${message.author.id}>, kamu tidak diizinkan mengirim link (URL) di server ini!`
                );
                
                const sentWarn = await message.channel.send({ embeds: [warnMsg] });
                
                // Menghapus peringatan otomatis setelah 5 detik
                setTimeout(() => sentWarn.delete().catch(() => {}), 5000);
            }
        } catch (error) {
            console.error('[ERROR EVENT MESSAGE CREATE]', error);
        }
    }
};