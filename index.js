// ==================== ANTI-CRASH YT-DLP V2 ====================
process.env.PYTHONWARNINGS = 'ignore';
process.noDeprecation = true;

const originalParse = JSON.parse;
JSON.parse = function (text, reviver) {
    if (typeof text === 'string') {
        const trimmed = text.trim();
        // Jika ada kata peringatan yang merusak JSON
        if (trimmed.includes('Deprecated') || trimmed.includes('WARNING')) {
            const startIdx = trimmed.search(/[\{\[]/); // Cari tanda awal JSON ({ atau [)
            if (startIdx !== -1) {
                text = trimmed.substring(startIdx); // Potong dan ambil JSON-nya saja
            } else {
                return {}; // Jika hanya teks peringatan kosong, abaikan agar tidak crash
            }
        }
    }
    
    // Keamanan lapis kedua: cegah mati total jika masih gagal
    try {
        return originalParse.call(JSON, text, reviver);
    } catch (error) {
        if (typeof text === 'string' && (text.includes('youtube') || text.includes('dlp'))) {
            return {}; 
        }
        throw error;
    }
};
// ==============================================================

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// ====================== KONEKSI MONGODB ======================
console.log('🗄️  Menghubungkan ke MongoDB Atlas...');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ [SUKSES] Terhubung ke Database Cloud MongoDB.'))
    .catch(err => console.error('❌ [ERROR] Gagal terhubung ke MongoDB:', err.message));
// =============================================================

// ====================== KONFIGURASI AWAL ======================
process.env.YTDLP_DISABLE_DOWNLOAD = 'true'; // Mencegah download otomatis yt-dlp

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Collection untuk commands
client.commands = new Collection();

console.log('====================================');
console.log('🌙 LUNAR BOT - MEMULAI BOOTING');
console.log('====================================\n');

// ====================== COMMAND HANDLER ======================
console.log('🔄 Memuat semua perintah...');
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

let commandCount = 0;

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);

            if (command && command.name) {
                // Command utama
                client.commands.set(command.name, command);
                commandCount++;

                // Alias command
                if (command.aliases) {
                    for (const alias of command.aliases) {
                        client.commands.set(alias, command);
                    }
                }

                if (command.data) {
                    console.log(`✅ [SLASH] ${folder}/${command.name}`);
                } else {
                    console.log(`📌 [PREFIX] ${folder}/${command.name}`);
                }
            } else {
                console.warn(`⚠️  Perintah ${folder}/${file} tidak memiliki properti "name".`);
            }
        } catch (error) {
            console.error(`❌ Gagal memuat perintah ${folder}/${file}:`, error.message);
        }
    }
}
console.log(`✅ Berhasil memuat ${commandCount} perintah.\n`);

// ====================== EVENT HANDLER ======================
console.log('🔄 Memuat semua event...');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`📡 Event ${event.name} dimuat`);
    } catch (error) {
        console.error(`❌ Gagal memuat event ${file}:`, error.message);
    }
}
console.log(`✅ Berhasil memuat ${eventFiles.length} event.\n`);

// ====================== LOGIN & SETUP ======================
console.log('🚀 Menghubungkan ke Discord...');

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('🔑 Login berhasil, menunggu client ready...');
    })
    .catch(error => {
        console.error('❌ Gagal login ke Discord:', error.message);
        process.exit(1);
    });

// ====================== SETUP SAAT READY ======================
client.once('clientReady', async () => {
    console.log(`🎉 [SUKSES] Bot online sebagai: ${client.user.tag}`);
    console.log(`📡 Melayani ${client.guilds.cache.size} server.\n`);

    // Setup Music Helper (dilakukan setelah bot ready)
    try {
        const { setupMusic } = require('./helpers/musicHelper.js');
        setupMusic(client);
    } catch (error) {
        console.error('❌ [ERROR] Gagal menginisialisasi sistem musik:', error);
    }
});

// Tangani error global
process.on('unhandledRejection', error => {
    console.error('❌ [UNHANDLED REJECTION]', error);
});

process.on('uncaughtException', error => {
    console.error('❌ [UNCAUGHT EXCEPTION]', error);
});
