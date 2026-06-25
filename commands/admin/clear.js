const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'clear',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🛡️ [ADMIN] Menghapus hingga 100 pesan sekaligus di channel ini.')
        .addIntegerOption(option => 
            option.setName('jumlah')
                .setDescription('Jumlah pesan yang ingin dihapus (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        // Membatasi agar perintah ini hanya muncul bagi member yang punya izin Manage Messages
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

    async executeSlash(interaction, client) {
        // Pengecekan izin ekstra untuk keamanan
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki izin untuk menggunakan perintah ini!')], ephemeral: true });
        }

        const amount = interaction.options.getInteger('jumlah');
        await this.processClear(interaction, interaction.channel, amount, true);
    },

    async executePrefix(message, args, client) {
        // Pengecekan izin untuk Prefix
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki izin untuk mengelola pesan!')] });
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({ embeds: [errorEmbed('Format Salah', 'Masukkan angka antara 1 hingga 100!\nContoh: `lunar!clear 50`')] });
        }

        await this.processClear(message, message.channel, amount, false);
    },

    async processClear(context, channel, amount, isSlash) {
        try {
            // Jika via prefix, tambahkan 1 ke amount untuk ikut menghapus pesan perintah (lunar!clear) itu sendiri
            const fetchAmount = isSlash ? amount : amount + 1;
            
            // Mengambil dan menghapus pesan. 
            // Parameter 'true' mencegah bot error jika ada pesan yang usianya lebih dari 14 hari (batasan Discord API)
            const deletedMessages = await channel.bulkDelete(fetchAmount, true);

            const actualDeleted = isSlash ? deletedMessages.size : deletedMessages.size - 1;

            const successReply = successEmbed(
                'Pembersihan Selesai 🧹', 
                `Berhasil menghapus **${actualDeleted}** pesan dari channel ini.`
            );

            if (isSlash) {
                await context.reply({ embeds: [successReply], ephemeral: true });
            } else {
                // Untuk prefix, kirim pesan sukses lalu hapus pesan sukses tersebut setelah 3 detik agar channel tetap bersih
                const msg = await channel.send({ embeds: [successReply] });
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            }
        } catch (error) {
            console.error('[ERROR CLEAR COMMAND]', error);
            const errReply = errorEmbed('Gagal Menghapus', 'Terjadi kesalahan. Pastikan bot memiliki izin "Manage Messages" dan "Read Message History".');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.channel.send({ embeds: [errReply] });
        }
    }
};