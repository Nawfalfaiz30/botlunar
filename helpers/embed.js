const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

const colors = {
    default: process.env.EMBED_COLOR || '#2b2d31',
    success: '#57F287',
    error: '#ED4245',
    warning: '#FEE75C',
    info: '#5865F2'
};

let botAvatarURL = 'https://i.imgur.com/AffbXZj.png';

module.exports = {
    setBotAvatar: (url) => { botAvatarURL = url; },

    /**
     * Embed Template dengan desain Modern
     */
    baseEmbed: (title, description, color = colors.default) => {
        return new EmbedBuilder()
            .setColor(color)
            .setAuthor({ 
                name: '🌙 Bot Lunar | System', 
                iconURL: botAvatarURL 
            })
            .setTitle(title ? `✨ ${title}` : null)
            .setDescription(description || null)
            .setTimestamp()
            .setFooter({ text: 'Lunar • Moderation & Utility', iconURL: botAvatarURL });
    },

    successEmbed: (title, description) => 
        module.exports.baseEmbed(title, description, colors.success),

    errorEmbed: (title, description) => 
        module.exports.baseEmbed(title || 'Terjadi Kesalahan', description, colors.error),

    warningEmbed: (title, description) => 
        module.exports.baseEmbed(title, description, colors.warning),

    infoEmbed: (title, description) => 
        module.exports.baseEmbed(title, description, colors.info),

    // Template khusus untuk Moderasi (bisa Anda gunakan di addrole/removerole)
    modEmbed: (title, description) => {
    return new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`🛡️ ${title}`)
        .setDescription(description)
        .setTimestamp()
        .setFooter({
            text: 'Lunar Audit Log',
            iconURL: botAvatarURL
        });
    }
};