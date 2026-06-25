const { Events, ActivityType } = require('discord.js');
const { setBotAvatar } = require('../helpers/embed.js'); // Import fungsi untuk sinkronisasi logo

module.exports = {
    // Menentukan event yang didengarkan (saat bot siap digunakan)
    name: Events.ClientReady,
    
    // once: true berarti event ini hanya dijalankan satu kali saat bot pertama kali menyala
    once: true,
    
    execute(client) {
        console.log(`\n🎉 [SUKSES] Sistem bot menyala! Terhubung sebagai: ${client.user.tag}`);
        console.log(`📡 Lunar melayani ${client.guilds.cache.size} server dan siap beroperasi.`);

        // --- SINKRONISASI AVATAR OTOMATIS ---
        // Mengupdate ikon footer di helpers/embed.js dengan avatar bot yang asli
        setBotAvatar(client.user.displayAvatarURL());

        // --- SISTEM STATUS ROTASI (ROTATING PRESENCE) ---
        // Daftar status yang akan ditampilkan secara bergantian di profil bot
        const activities = [
            { name: 'lunar!help | Mengawasi Server', type: ActivityType.Watching },
            { name: 'dengan Claude AI | lunar!ai', type: ActivityType.Playing },
            { name: 'musik dan perintah member', type: ActivityType.Listening },
            { name: `${client.guilds.cache.size} Server Komunitas`, type: ActivityType.Watching }
        ];

        let index = 0;
        
        // Menyetel status pertama kali saat bot menyala
        client.user.setActivity(activities[index].name, { type: activities[index].type });
        index = (index + 1) % activities.length;
        
        // Fungsi setInterval untuk memutar status setiap 10 detik
        setInterval(() => {
            client.user.setActivity(activities[index].name, { type: activities[index].type });
            
            // Berpindah ke status berikutnya, kembali ke 0 jika sudah mencapai batas akhir
            index = (index + 1) % activities.length;
        }, 10000);
        
        // Status ketersediaan bot (online, idle, dnd)
        client.user.setStatus('online');
    },
};