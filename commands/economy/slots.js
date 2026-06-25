const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'slots',
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Bermain mesin slot untuk melipatgandakan koin.')
        .addStringOption(option => 
            option.setName('taruhan')
                .setDescription('Jumlah taruhan (Bisa pakai 1k, 1m, atau all)')
                .setRequired(true)
        ),

    parseBet(betStr, userBalance) {
        if (!betStr) return 0;
        let str = String(betStr).toLowerCase().trim();
        
        if (str === 'all' || str === 'max') return userBalance;

        let multiplier = 1;
        if (str.endsWith('k')) { multiplier = 1000; str = str.slice(0, -1); }
        else if (str.endsWith('m')) { multiplier = 1000000; str = str.slice(0, -1); }
        else if (str.endsWith('b')) { multiplier = 1000000000; str = str.slice(0, -1); }

        let amount = parseFloat(str) * multiplier;
        return (isNaN(amount) || amount <= 0) ? 0 : Math.floor(amount);
    },

    async executeSlash(interaction) {
        const betInput = interaction.options.getString('taruhan');
        await this.processSlots(interaction, interaction.user, betInput, true);
    },

    async executePrefix(message, args) {
        const betInput = args[0];
        if (!betInput) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!slots [taruhan]`\nContoh: `lunar!slots 1k`')] });
        await this.processSlots(message, message.author, betInput, false);
    },

    async processSlots(context, user, betInput, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) userData = await User.create({ userId: user.id, koin: 0 });

            const userBalance = userData.koin || 0;
            const betAmount = this.parseBet(betInput, userBalance);

            // 2. Validasi Taruhan
            if (betAmount <= 0) {
                const err = errorEmbed('Taruhan Tidak Valid', 'Masukkan jumlah taruhan yang benar (contoh: 100, 1k, 1m, all).');
                return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
            }

            if (userBalance < betAmount) {
                const err = errorEmbed('Saldo Tidak Cukup', `Kamu mencoba bertaruh **🪙 ${betAmount}**, tapi saldomu hanya **🪙 ${userBalance}**.`);
                return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
            }

            // 3. Potong saldo awal
            userData.koin -= betAmount;

            // 4. Logika Mesin Slot
            const emojis = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎'];
            const slot1 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot2 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot3 = emojis[Math.floor(Math.random() * emojis.length)];

            let resultText = '';
            let color = '';

            if (slot1 === slot2 && slot2 === slot3) {
                const win = betAmount * 5; // Jackpot x5
                userData.koin += win;
                resultText = `🎉 **JACKPOT!** Kamu memenangkan **🪙 ${win} Koin**!`;
                color = '#57F287';
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                const win = Math.floor(betAmount * 1.5); // Menang x1.5
                userData.koin += win;
                resultText = `✅ **Menang!** Kamu mendapatkan **🪙 ${win} Koin**!`;
                color = '#FEE75C';
            } else {
                resultText = `❌ **Kalah.** Kamu kehilangan **🪙 ${betAmount} Koin**. Coba lagi!`;
                color = '#ED4245';
            }
            
            // 5. Simpan ke MongoDB
            await userData.save();

            const embed = baseEmbed('🎰 Mesin Slot Lunar', `**[ ${slot1} | ${slot2} | ${slot3} ]**\n\n${resultText}\n💰 Sisa Saldo: **🪙 ${userData.koin}**`, color);
            return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR SLOTS MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan sistem saat bermain slot.', ephemeral: true });
        }
    }
};