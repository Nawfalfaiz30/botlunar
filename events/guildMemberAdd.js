const { EmbedBuilder, Events } = require('discord.js');
const Guild = require('../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // 🟢 MENGAMBIL DATA DARI MONGODB
            const guildData = await Guild.findOne({ guildId: member.guild.id });

            // Cek apakah server ini sudah menyetel welcomeChannel
            if (!guildData || !guildData.welcomeChannel) return;

            const welcomeChannel = member.guild.channels.cache.get(guildData.welcomeChannel);
            if (!welcomeChannel) return;

            // Membuat Embed Welcome
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎉 Selamat Datang di ${member.guild.name}!`)
                .setDescription(`Halo ${member}! Selamat bergabung di server kami.\nJangan lupa untuk membaca peraturan server ya!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `Member ke-${member.guild.memberCount}` })
                .setTimestamp();

            await welcomeChannel.send({ embeds: [welcomeEmbed] });

        } catch (error) {
            console.error('[ERROR WELCOME MONGODB]', error);
        }
    }
};