const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('❌ ERROR: Pastikan file .env berisi:');
    console.error('DISCORD_TOKEN=your_token');
    console.error('CLIENT_ID=your_bot_id');
    console.error('GUILD_ID=your_server_id');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandNames = new Set(); // Untuk deteksi duplikat

console.log('🔍 Memindai semua folder command...\n');

function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
            loadCommands(fullPath);
        } 
        else if (file.endsWith('.js')) {
            try {
                // Bersihkan cache agar tidak terbaca 2x
                delete require.cache[require.resolve(fullPath)];

                const command = require(fullPath);

                if (command && command.data) {
                    const commandName = command.data.name;

                    if (commandNames.has(commandName)) {
                        console.warn(`⚠️ DUPLIKAT DITEMUKAN: "${commandName}"`);
                        console.warn(`   → ${path.relative(__dirname, fullPath)}`);
                    } else {
                        commandNames.add(commandName);
                        commands.push(command.data.toJSON());
                        console.log(`   ✅ ${commandName} (${path.relative(__dirname, fullPath)})`);
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Gagal memuat ${file}: ${err.message}`);
            }
        }
    }
}

// Mulai memuat
loadCommands(commandsPath);

console.log(`\n📊 Total unique commands: ${commands.length} (dari ${commandNames.size} nama unik)`);

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('\n🚀 Sedang mendaftarkan slash commands ke Discord...');

        // Deploy ke server tertentu (paling cepat untuk testing)
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('\n✅ BERHASIL! Slash commands telah didaftarkan.');
        console.log('Silakan ketik "/" di Discord dan cari command kamu.');
        
    } catch (error) {
        console.error('\n❌ Gagal deploy:', error.message);
        
        if (error.message.includes('DUPLICATE')) {
            console.error('\n💡 Saran: Hapus command duplikat terlebih dahulu!');
        }
    }
})();