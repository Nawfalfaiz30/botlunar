const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'remindme',
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('⏰ Mengatur pengingat otomatis yang akan dikirim melalui DM.')
        .addIntegerOption(option => 
            option.setName('menit')
                .setDescription('Durasi tunggu dalam hitungan menit')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option => 
            option.setName('pesan')
                .setDescription('Hal yang ingin diingatkan')
                .setRequired(true)
        ),

    // ====================== SLASH COMMAND ======================
    async executeSlash(interaction, client) {
        const minutes = interaction.options.getInteger('menit');
        const reason = interaction.options.getString('pesan');
        await this.setReminder(interaction, interaction.user, minutes, reason, true);
    },

    // ====================== PREFIX COMMAND ======================
    async executePrefix(message, args, client) {
        const minutes = parseInt(args[0]);
        const reason = args.slice(1).join(' ');

        if (isNaN(minutes) || !reason) {
            return message.reply({ 
                embeds: [warningEmbed('Format Salah', 'Gunakan format: `lunar!remindme [menit] [pesan]`\nContoh: `lunar!remindme 10 Angkat jemuran`')] 
            });
        }
        await this.setReminder(message, message.author, minutes, reason, false);
    },

    // ====================== LOGIKA UTAMA ======================
    async setReminder(context, user, minutes, reason, isSlash) {
        const ms = minutes * 60 * 1000;
        const targetTime = Date.now() + ms;

        // Pesan konfirmasi di channel publik bahwa pengingat telah dijadwalkan
        const confirmEmbed = successEmbed(
            '⏰ Pengingat Diatur!',
            `Lunar akan mengirimkan pengingat ke **DM kamu** tentang: **"${reason}"**\n⏱️ Waktu eksekusi: <t:${Math.floor(targetTime / 1000)}:R>.`
        );

        if (isSlash) {
            await context.reply({ embeds: [confirmEmbed] });
        } else {
            await context.reply({ embeds: [confirmEmbed] });
        }

        // Jalankan hitungan mundur pengingat
        setTimeout(async () => {
            // Menggunakan # >>> untuk memberikan efek blok besar dan tebal
            const remindEmbed = successEmbed(
                '🔔 WAKTU HABIS!',
                `Halo **${user.username}**, ini adalah pengingat pesan yang kamu atur, pesannya adalah:\n\n# >>> ${reason}`
            ).setColor('#FEE75C');

            try {
                // KUNCI PERBAIKAN: Mengirim pesan langsung ke DM User
                await user.send({ embeds: [remindEmbed] });
            } catch (error) {
                console.error(`[ERROR REMINDME] Gagal mengirim DM ke user ${user.id}:`, error.message);
                
                // Opsional: Jika DM dikunci, bot akan mencoba mengirim log error super kasat mata ke channel asal
                // jika Anda benar-benar tidak ingin ada fallback di channel sama sekali, baris di bawah ini bisa dihapus.
                const lockedDmEmbed = errorEmbed(
                    '❌ Gagal Mengirim Pengingat',
                    `<@${user.id}>, Lunar gagal mengirimkan pengingat via DM. Pastikan pengaturan **"Allow Direct Messages from server members"** kamu aktif!`
                );
                await context.channel?.send({ content: `<@${user.id}>`, embeds: [lockedDmEmbed] }).catch(() => {});
            }
        }, ms);
    }
};