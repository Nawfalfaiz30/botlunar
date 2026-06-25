const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'pay',
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('💸 Mentransfer koin milikmu ke pengguna lain.')
        .addUserOption(option => option.setName('target').setDescription('Pilih penerima').setRequired(true))
        .addIntegerOption(option => option.setName('jumlah').setDescription('Jumlah koin').setRequired(true).setMinValue(1)),

    async executeSlash(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('jumlah');
        await this.processPay(interaction, interaction.user, target, amount, true);
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount < 1) {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!pay @Member [jumlah]`')] });
        }
        await this.processPay(message, message.author, target, amount, false);
    },

    async processPay(context, sender, receiver, amount, isSlash) {
        if (sender.id === receiver.id) return context.reply({ content: 'Kamu tidak bisa mentransfer ke diri sendiri!', ephemeral: isSlash });
        if (receiver.bot) return context.reply({ content: 'Bot tidak membutuhkan uang.', ephemeral: isSlash });

        try {
            // 1. Mengurangi Koin Sender (Atomic Operation)
            // Query { koin: { $gte: amount } } memastikan transfer gagal jika saldo kurang
            const updatedSender = await User.findOneAndUpdate(
                { userId: sender.id, koin: { $gte: amount } },
                { $inc: { koin: -amount } },
                { returnDocument: 'after' }
            );

            // Jika updatedSender null, artinya saldo kurang
            if (!updatedSender) {
                const err = errorEmbed('Saldo Tidak Cukup', `Kamu tidak memiliki **${amount} Koin** untuk ditransfer.`);
                return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
            }

            // 2. Menambah Koin Receiver (Atomic Operation)
            // upsert: true membuat akun user penerima otomatis jika mereka belum pernah main bot
            await User.findOneAndUpdate(
                { userId: receiver.id },
                { $inc: { koin: amount } },
                { upsert: true, returnDocument: 'after' }
            );

            const reply = successEmbed('Transfer Berhasil 💸', `Kamu telah mengirimkan **🪙 ${amount} Koin** kepada **${receiver.username}**.`);
            return isSlash ? await context.reply({ embeds: [reply] }) : await context.reply({ embeds: [reply] });

        } catch (error) {
            console.error('[ERROR PAY MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan sistem saat memproses transfer.', ephemeral: true });
        }
    }
};