const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const Warning = require('../../models/warnSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'warnings',
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('🛡️ [ADMIN] Melihat riwayat teguran member.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    // =================================================================
    // FALLBACK HANDLER (Mencegah Error Jika Main Handler Mencari 'execute')
    // =================================================================
    async execute(interaction) {
        await this.executeSlash(interaction);
    },

    // ==========================================
    // SLASH COMMAND HANDLER
    // ==========================================
    async executeSlash(interaction) {
        try {
            // 🟢 Mencegah Timeout 3 Detik dari Discord
            await interaction.deferReply().catch(() => {});
            
            const targetUser = interaction.options.getUser('user');
            await this.handleLogic(interaction, targetUser, true);
        } catch (err) {
            console.error('[ERROR SLASH WARNINGS]', err);
        }
    },

    // ==========================================
    // PREFIX COMMAND HANDLER
    // ==========================================
    async executePrefix(ctx, args) {
        const targetUser = ctx.mentions.users.first();

        if (!targetUser) {
            return ctx.reply({
                embeds: [warningEmbed(
                    'Format Salah',
                    'Gunakan: `!warnings @user`'
                )]
            });
        }

        await this.handleLogic(ctx, targetUser, false);
    },

    // ==========================================
    // LOGIKA UTAMA (MONGODB)
    // ==========================================
    async handleLogic(ctx, targetUser, isSlash) {
        try {
            // 1. Cek Permission Admin
            if (!ctx.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                const err = errorEmbed(
                    'Akses Ditolak',
                    'Kamu tidak memiliki izin untuk melihat riwayat peringatan.'
                );

                return isSlash
                    ? ctx.editReply({ embeds: [err] }) // Pakai editReply karena sudah di-defer
                    : ctx.reply({ embeds: [err] });
            }

            // 2. Ambil data dari MongoDB berdasarkan ID Server dan ID User
            const guildId = ctx.guild.id;
            const userWarnsDoc = await Warning.findOne({ guildId: guildId, userId: targetUser.id });

            // 3. Jika data tidak ditemukan atau array peringatan kosong
            if (!userWarnsDoc || userWarnsDoc.warnings.length === 0) {
                const clean = baseEmbed(
                    'Catatan Bersih 🌟',
                    `**${targetUser.username}** tidak memiliki riwayat teguran.`,
                    '#57F287'
                );

                return isSlash
                    ? ctx.editReply({ embeds: [clean] })
                    : ctx.reply({ embeds: [clean] });
            }

            // 4. Jika ada data, susun teks riwayatnya
            const warningsList = userWarnsDoc.warnings;
            let warnText = '';

            warningsList.forEach((warn, index) => {
                // Mengubah timestamp MongoDB menjadi format waktu Discord (Unix)
                const dateUnix = Math.floor(new Date(warn.timestamp).getTime() / 1000);

                // warn.reason dan warn.moderatorId adalah nama variabel dari warnSchema.js
                warnText += 
                    `**${index + 1}.** ${warn.reason}\n` +
                    `👮 Oleh: <@${warn.moderatorId}> | 📅 <t:${dateUnix}:d>\n\n`;
            });

            // 5. Kirim Embed Laporan
            const report = baseEmbed(
                `Riwayat Teguran: ${targetUser.username}`,
                `Total Teguran: **${warningsList.length}**\n\n${warnText}`,
                '#ED4245'
            );

            return isSlash
                ? ctx.editReply({ embeds: [report] })
                : ctx.reply({ embeds: [report] });

        } catch (error) {
            console.error('[ERROR WARNINGS MONGODB]', error);

            const err = errorEmbed(
                'Gagal',
                'Terjadi kesalahan saat mengambil data peringatan dari database.'
            );

            return isSlash
                ? ctx.editReply({ embeds: [err] })
                : ctx.reply({ embeds: [err] });
        }
    }
};