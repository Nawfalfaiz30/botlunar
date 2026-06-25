const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            // 🟢 MENGAMBIL DATA DARI MONGODB
            const guildConfig = await Guild.findOne({ guildId: member.guild.id });

            // Cek apakah data server ada dan sudah menyetel goodbyeChannel
            if (!guildConfig || !guildConfig.goodbyeChannel) return;

            const goodbyeChannel = member.guild.channels.cache.get(guildConfig.goodbyeChannel);
            if (!goodbyeChannel) return;

            // Membuat Embed Goodbye
            const goodbyeEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(`👋 Sampai Jumpa!`)
                .setDescription(`**${member.user.username}** baru saja meninggalkan server.\nSemoga sukses di luar sana!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `Sisa member: ${member.guild.memberCount}` })
                .setTimestamp();

            await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
        } catch (error) {
            console.error('[ERROR GOODBYE MONGODB]', error);
        }
    }
};