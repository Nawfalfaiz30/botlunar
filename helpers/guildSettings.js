const { baseEmbed } = require('./embed.js');
const Guild = require('../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    /**
     * Menyimpan ID channel log ke MongoDB
     */
    setLogChannel: async (guildId, channelId) => {
        try {
            await Guild.findOneAndUpdate(
                { guildId: guildId },
                { logChannel: channelId },
                { upsert: true, returnDocument: 'after' }
            );
        } catch (error) {
            console.error('[ERROR SET LOG CHANNEL]', error);
        }
    },

    /**
     * Mengambil ID channel log dari MongoDB
     */
    getLogChannel: async (guildId) => {
        try {
            const guildData = await Guild.findOne({ guildId: guildId });
            return guildData?.logChannel || null;
        } catch (error) {
            console.error('[ERROR GET LOG CHANNEL]', error);
            return null;
        }
    },

    /**
     * Menghapus channel log di MongoDB
     */
    removeLogChannel: async (guildId) => {
        try {
            // $unset digunakan untuk menghapus field/kolom logChannel dari dokumen tersebut
            await Guild.findOneAndUpdate(
                { guildId: guildId },
                { $unset: { logChannel: 1 } },
                { returnDocument: 'after' }
            );
        } catch (error) {
            console.error('[ERROR REMOVE LOG CHANNEL]', error);
        }
    },

    /**
     * Fungsi untuk mengirim pesan ke channel log moderasi secara otomatis
     * @param {Object} guild - Objek Guild Discord
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi log
     * @param {string} color - Warna embed (opsional)
     */
    sendToLog: async (guild, title, description, color = '#3498db') => {
        // 🟢 Karena getLogChannel sekarang beroperasi di DB, kita wajib memakai 'await'
        const channelId = await module.exports.getLogChannel(guild.id);
        if (!channelId) return;

        try {
            // fetch dengan catch agar bot tidak crash jika channel sudah dihapus oleh Admin
            const channel = await guild.channels.fetch(channelId).catch(() => null);
            
            if (channel && channel.isTextBased()) {
                await channel.send({ embeds: [baseEmbed(title, description, color)] });
            }
        } catch (error) {
            console.error('[ERROR SEND TO LOG]', error);
        }
    }
};