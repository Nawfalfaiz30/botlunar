const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, warningEmbed, errorEmbed, baseEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'birthday',
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('🎂 Mengatur atau melihat tanggal ulang tahunmu.')
        .addStringOption(option => 
            option.setName('tanggal')
                .setDescription('Format: DD/MM (Contoh: 25/12). Kosongkan untuk melihat data.')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        const tanggal = interaction.options.getString('tanggal');
        await this.processBirthday(interaction, interaction.user, tanggal, true);
    },

    async executePrefix(message, args) {
        const tanggal = args[0];
        await this.processBirthday(message, message.author, tanggal, false);
    },

    async processBirthday(context, user, tanggal, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) userData = await User.create({ userId: user.id, koin: 0, inventory: [] });

            // 2. Jika user hanya ingin MELIHAT data
            if (!tanggal) {
                if (!userData.birthday) {
                    const warn = warningEmbed('Belum Diatur', 'Kamu belum mengatur tanggal ulang tahun. Gunakan perintah `lunar!birthday DD/MM` (contoh: `lunar!birthday 14/02`).');
                    return isSlash ? await context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
                }
                const info = baseEmbed('🎂 Informasi Ulang Tahun', `Tanggal ulang tahunmu tercatat pada: **${userData.birthday}**`, '#FEE75C');
                return isSlash ? await context.reply({ embeds: [info], ephemeral: true }) : await context.reply({ embeds: [info] });
            }

            // 3. Jika user ingin MENGATUR data baru
            const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
            if (!regex.test(tanggal)) {
                const err = warningEmbed('Format Salah', 'Gunakan format DD/MM.\nContoh: `14/02` untuk 14 Februari.');
                return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
            }

            // 4. Update ke Database
            userData.birthday = tanggal;
            await userData.save();

            const success = successEmbed('Berhasil Disimpan 🎂', `Tanggal ulang tahunmu berhasil diatur menjadi **${tanggal}**.`);
            return isSlash ? await context.reply({ embeds: [success] }) : await context.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR BIRTHDAY MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat memproses data ulang tahun.')] });
        }
    }
};