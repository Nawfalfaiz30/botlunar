const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, successEmbed } = require('../../helpers/embed.js');
const { formatDuration, getRandomInt } = require('../../helpers/utils.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'daily',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💰 Klaim hadiah koin gratis setiap 24 jam!'),

    async executeSlash(interaction) { await this.processDaily(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processDaily(message, message.author, false); },

    async processDaily(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) userData = await User.create({ userId: user.id, koin: 0 });

            // Inisialisasi object cooldowns jika belum ada di database
            if (!userData.cooldowns) userData.cooldowns = {};

            // 2. Konfigurasi Cooldown (24 Jam dalam satuan milidetik)
            const cooldownAmount = 24 * 60 * 60 * 1000;
            const lastDaily = userData.cooldowns.lastDaily || 0;
            const now = Date.now();

            // 3. Pengecekan Cooldown
            if (now - lastDaily < cooldownAmount) {
                const timeLeft = cooldownAmount - (now - lastDaily);
                
                const warnEmbed = warningEmbed(
                    'Sudah Diklaim!', 
                    `Kamu sudah mengambil hadiah harianmu hari ini.\nSilakan kembali lagi dalam **${formatDuration(timeLeft)}**.`
                );
                
                return isSlash ? await context.reply({ embeds: [warnEmbed] }) : await context.reply({ embeds: [warnEmbed] });
            }

            // 4. Memberikan Hadiah
            const reward = getRandomInt(300, 700);

            // Update data di MongoDB
            userData.cooldowns.lastDaily = now;
            userData.koin += reward;
            await userData.save();

            // 5. Menampilkan Pesan Keberhasilan
            const resultEmbed = successEmbed(
                'Hadiah Harian Diklaim!', 
                `Selamat! Kamu mendapatkan **${reward} Koin** 🪙 hari ini.\n\n💰 **Total Saldo:** ${userData.koin} Koin`
            );

            return isSlash ? await context.reply({ embeds: [resultEmbed] }) : await context.reply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('[ERROR DAILY MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan saat memproses hadiah harian.', ephemeral: true });
        }
    }
};