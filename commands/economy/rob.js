const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const { formatDuration, getRandomInt } = require('../../helpers/utils.js');
const { addKoin, removeKoin } = require('../../helpers/economyHelper.js'); // 🟢 Sekarang async
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'rob',
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('🥷 Mencoba mencuri koin dari member lain (Risiko ditanggung sendiri!)')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih member yang ingin kamu rampok')
                .setRequired(true)
        ),

    async executeSlash(interaction) {
        const targetUser = interaction.options.getUser('target');
        await this.processRob(interaction, interaction.user, targetUser, true);
    },

    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply({ embeds: [warningEmbed('Tag Target', 'Kamu harus me-mention orang yang ingin dirampok!\nContoh: `lunar!rob @Budi`')] });
        }
        await this.processRob(message, message.author, targetUser, false);
    },

    async processRob(context, user, targetUser, isSlash) {
        if (targetUser.id === user.id) return context.reply({ content: 'Kamu tidak bisa merampok dirimu sendiri!', ephemeral: true });
        if (targetUser.bot) return context.reply({ content: 'Bot tidak memiliki dompet untuk dirampok.', ephemeral: true });

        try {
            // 1. Ambil data Sender dan Target dari MongoDB
            let sender = await User.findOne({ userId: user.id });
            let target = await User.findOne({ userId: targetUser.id });

            if (!sender) sender = await User.create({ userId: user.id, koin: 0 });
            if (!target) target = await User.create({ userId: targetUser.id, koin: 0 });

            // 2. Cooldown (2 jam)
            if (!sender.cooldowns) sender.cooldowns = {};
            const cooldownAmount = 2 * 60 * 60 * 1000;
            const lastRob = sender.cooldowns.lastRob || 0;
            const now = Date.now();

            if (now - lastRob < cooldownAmount) {
                const timeLeft = cooldownAmount - (now - lastRob);
                return context.reply({ embeds: [warningEmbed('Sembunyi!', `Polisi sedang berpatroli. Tunggu **${formatDuration(timeLeft)}** sebelum merampok lagi.`)] });
            }

            // 3. Syarat minimal saldo
            if (target.koin < 200) return context.reply({ embeds: [errorEmbed('Target Miskin', `Kasihan, **${targetUser.username}** tidak memiliki cukup koin untuk dirampok.`)] });
            if (sender.koin < 200) return context.reply({ embeds: [errorEmbed('Modal Kurang', `Kamu butuh minimal 200 koin di dompetmu sebagai jaminan denda jika tertangkap.`)] });

            // 4. Update Cooldown
            sender.cooldowns.lastRob = now;
            await sender.save();

            // 5. Probabilitas & Eksekusi
            const isSuccess = Math.random() < 0.45;
            const amount = getRandomInt(50, 500);

            if (isSuccess) {
                // Gunakan helper async
                await removeKoin(targetUser.id, amount);
                await addKoin(user.id, amount);
                
                const embed = successEmbed('Perampokan Sukses! 🥷', `Kamu berhasil menyelinap dan mengambil **${amount} Koin** dari **${targetUser.username}**.`);
                return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
            } else {
                // Denda
                await removeKoin(user.id, amount);
                const embed = errorEmbed('Tertangkap Basah! 👮', `Kamu ketahuan saat mencoba merampok **${targetUser.username}**! Kamu didenda sebesar **${amount} Koin** dan melarikan diri.`);
                return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[ERROR ROB MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat mencoba merampok.')] });
        }
    }
};