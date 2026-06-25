const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'afk',
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Menandai dirimu sebagai AFK (Away From Keyboard).')
        .addStringOption(option => 
            option.setName('alasan')
                .setDescription('Alasan kamu AFK')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        const reason = interaction.options.getString('alasan') || 'Ada urusan sebentar.';
        // 🟢 FIX: Menambahkan argumen 'reason' yang sebelumnya tertinggal
        await this.setAFK(interaction, interaction.user, reason, true);
    },

    async executePrefix(message, args) {
        const reason = args.join(' ') || 'Ada urusan sebentar.';
        await this.setAFK(message, message.author, reason, false);
    },

    async setAFK(context, user, reason, isSlash) {
        try {
            // 1. Ambil/Buat data User di MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) {
                // Catatan: Pastikan default skema inventory dsb menyesuaikan jika perlu
                userData = await User.create({ userId: user.id, koin: 0, inventory: [] });
            }

            // 2. Update status AFK
            userData.afk = {
                isAfk: true,
                reason: reason,
                time: Date.now(),
                mentions: []
            };

            await userData.save();

            const embed = successEmbed(
                '💤 Status AFK Aktif', 
                `**${user.username}** sekarang sedang AFK.\n📝 **Alasan:** *"${reason}"*\n\n*Lunar akan memberitahu member lain jika kamu di-mention. Ketik pesan apa saja untuk membatalkan.*`
            );

            return isSlash ? context.reply({ embeds: [embed] }) : context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR AFK MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan saat mengaktifkan status AFK.', ephemeral: true });
        }
    }
};