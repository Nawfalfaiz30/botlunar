const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/userSchema.js'); // Pastikan path ini mengarah ke file userSchema.js kamu

module.exports = {
    name: 'rpg',
    data: new SlashCommandBuilder()
        .setName('rpg')
        .setDescription('⚔️ Mengaktifkan akun RPG agar bisa mulai bermain.'),

    async executeSlash(interaction) {
        // Meneruskan eksekusi ke fungsi utama
        await this.processRPG(interaction, interaction.user, true);
    },

    async executePrefix(message, args) {
        // Meneruskan eksekusi ke fungsi utama (Hanya untuk diri sendiri)
        await this.processRPG(message, message.author, false);
    },

    async processRPG(context, user, isSlash) {
        try {
            // 1. Cek apakah user sudah ada di database MongoDB
            let userData = await User.findOne({ userId: user.id });

            // 2. KONDISI A: JIKA BELUM ADA (Pertama kali main)
            if (!userData) {
                // Buat profil baru berdasarkan userSchema
                await User.create({ userId: user.id });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('⚔️ Selamat Datang di Dunia RPG!')
                    .setColor('#2ECC71') // Hijau Success
                    .setDescription(`Halo <@${user.id}>, profil RPG kamu **berhasil dibuat**!\n\nKamu sekarang sudah terdaftar dan bisa menggunakan semua fitur ekonomi & petualangan. Mulailah dengan perintah seperti daily, hunt, atau mine!`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setTimestamp();

                return isSlash 
                    ? await context.reply({ embeds: [welcomeEmbed] }) 
                    : await context.reply({ embeds: [welcomeEmbed] });
            } 
            
            // 3. KONDISI B: JIKA SUDAH ADA (Sudah pernah mengaktifkan)
            else {
                const activeEmbed = new EmbedBuilder()
                    .setTitle('ℹ️ Status RPG')
                    .setColor('#3498DB') // Biru Info
                    .setDescription(`Halo <@${user.id}>, akun RPG kamu **sudah aktif**!\nKamu tidak perlu mendaftar lagi.\n\n*Gunakan perintah petualangan lainnya untuk bermain.*`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

                return isSlash 
                    ? await context.reply({ embeds: [activeEmbed], ephemeral: true }) 
                    : await context.reply({ embeds: [activeEmbed] });
            }

        } catch (error) {
            console.error('[ERROR COMMAND RPG]', error);
            const errorMsg = '❌ Terjadi kesalahan sistem saat mencoba mengaktifkan akun RPG-mu.';
            return isSlash 
                ? await context.reply({ content: errorMsg, ephemeral: true }) 
                : await context.reply({ content: errorMsg });
        }
    }
};