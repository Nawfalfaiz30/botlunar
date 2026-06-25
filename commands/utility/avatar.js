const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Menampilkan foto profil (Avatar) pengguna.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih pengguna yang ingin dilihat avatarnya')
                .setRequired(false)
        ),

    async executeSlash(interaction, client) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        await this.showAvatar(interaction, targetUser, true);
    },

    async executePrefix(message, args, client) {
        const targetUser = message.mentions.users.first() || message.author;
        await this.showAvatar(message, targetUser, false);
    },

    async showAvatar(context, user, isSlash) {
        // Mengambil URL avatar dengan resolusi tertinggi (1024) dan mendukung animasi (dynamic)
        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
        
        // Pembuatan peminta data (berbeda antara Slash dan Prefix)
        const requester = isSlash ? context.user.username : context.author.username;

        // Menggunakan EmbedBuilder bawaan dengan gaya Modern UI
        const embed = new EmbedBuilder()
            .setColor('#3498db') // Warna biru Discord
            .setTitle(`🖼️ Avatar: ${user.username}`)
            .setDescription(`[Klik di sini untuk resolusi penuh](${avatarUrl})`)
            .setImage(avatarUrl) // Ini yang membuat gambarnya menjadi besar di bawah teks
            .setTimestamp()
            .setFooter({ text: `Diminta oleh ${requester}` });

        return context.reply({ embeds: [embed] });
    }
};