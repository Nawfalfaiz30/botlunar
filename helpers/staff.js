const { sendToLog } = require('./guildSettings.js');

module.exports = {
    isStaff: (member) => {
        // Sesuaikan dengan logic staff Anda
        return member.permissions.has('ManageRoles');
    },
    
    // Fungsi ini wajib ada dan diekspor
    logModeration: async (guild, embed) => {
        try {
            await sendToLog(guild, embed.data.title, embed.data.description, embed.data.color);
        } catch (e) {
            console.error('Gagal mengirim ke log:', e);
        }
    }
};