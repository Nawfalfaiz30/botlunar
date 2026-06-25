const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'coinflip',
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Lempar koin! Pilih kepala atau ekor untuk menggandakan uangmu.')
        .addStringOption(option => 
            option.setName('taruhan')
                .setDescription('Jumlah taruhan (1k, 1m, all)')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('pilihan')
                .setDescription('Pilih Kepala (Head) atau Ekor (Tail)')
                .setRequired(true)
                .addChoices(
                    { name: '🗣️ Kepala (Head)', value: 'kepala' },
                    { name: '🪙 Ekor (Tail)', value: 'ekor' }
                )
        ),

    parseBet(betStr, userBalance) {
        if (!betStr) return 0;
        let str = String(betStr).toLowerCase().trim();
        if (str === 'all' || str === 'max') return userBalance;
        let multiplier = 1;
        if (str.endsWith('k')) { multiplier = 1000; str = str.slice(0, -1); }
        else if (str.endsWith('m')) { multiplier = 1000000; str = str.slice(0, -1); }
        let amount = parseFloat(str) * multiplier;
        return (isNaN(amount) || amount <= 0) ? 0 : Math.floor(amount);
    },

    async executeSlash(interaction) {
        const betInput = interaction.options.getString('taruhan');
        const pilihan = interaction.options.getString('pilihan');
        await this.processCoinflip(interaction, interaction.user, betInput, pilihan, true);
    },

    async executePrefix(message, args) {
        const pilihan = args[0] ? args[0].toLowerCase() : null;
        const betInput = args[1];

        if (!['kepala', 'ekor', 'head', 'tail'].includes(pilihan) || !betInput) {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!coinflip [kepala/ekor] [taruhan]`\nContoh: `lunar!coinflip kepala 5k`')] });
        }

        const choice = (pilihan === 'head') ? 'kepala' : (pilihan === 'tail') ? 'ekor' : pilihan;
        await this.processCoinflip(message, message.author, betInput, choice, false);
    },

    async processCoinflip(context, user, betInput, pilihan, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userDoc = await User.findOne({ userId: user.id });
            if (!userDoc) userDoc = await User.create({ userId: user.id, koin: 0 });

            const userBalance = userDoc.koin;
            const betAmount = this.parseBet(betInput, userBalance);

            // 2. Validasi
            if (betAmount <= 0) return context.reply({ embeds: [errorEmbed('Taruhan Tidak Valid', 'Masukkan jumlah yang benar.')] });
            if (userBalance < betAmount) return context.reply({ embeds: [errorEmbed('Saldo Kurang', 'Saldomu tidak cukup untuk taruhan ini.')] });

            // 3. Logika Permainan
            const hasilKoin = Math.random() < 0.5 ? 'kepala' : 'ekor';
            const isMenang = pilihan === hasilKoin;

            let resultText = '';
            let color = '';

            if (isMenang) {
                // Menang: Tambah koin
                await User.findOneAndUpdate({ userId: user.id }, { $inc: { koin: betAmount } });
                resultText = `🎉 **MENANG!** Koin menunjukkan **${hasilKoin.toUpperCase()}**.\nKamu mendapatkan **🪙 ${betAmount * 2} Koin** (Profit: ${betAmount})!`;
                color = '#57F287';
            } else {
                // Kalah: Kurangi koin
                await User.findOneAndUpdate({ userId: user.id }, { $inc: { koin: -betAmount } });
                resultText = `❌ **KALAH!** Koin menunjukkan **${hasilKoin.toUpperCase()}**.\nKamu kehilangan **🪙 ${betAmount} Koin**.`;
                color = '#ED4245';
            }

            // 4. Update saldo di objek agar tampilan embed akurat
            const finalBalance = isMenang ? (userBalance + betAmount) : (userBalance - betAmount);

            const embed = baseEmbed('🪙 Coinflip', `Tebakanmu: **${pilihan.toUpperCase()}**\n\n${resultText}\n💰 Sisa Saldo: **🪙 ${finalBalance}**`, color);
            return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR COINFLIP MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat memproses taruhan.')] });
        }
    }
};