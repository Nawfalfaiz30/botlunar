const { REST, Routes } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🗑️ Menghapus semua slash command di server...');
        
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }   // Kosongkan semua command
        );

        console.log('✅ Semua slash command di server sudah dihapus!');
        console.log('Sekarang jalankan deploy-commands.js lagi.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();   