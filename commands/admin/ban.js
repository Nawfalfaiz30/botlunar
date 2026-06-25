const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'ban',

    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🛡️ [ADMIN] Memblokir member dari server.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan ban')
        ),

    // SLASH COMMAND
    async executeSlash(ctx) {
        const targetUser = ctx.options.getUser('user');
        const reason = ctx.options.getString('alasan') || 'Tidak ada alasan';

        await this.handleLogic(ctx, targetUser, reason, true);
    },

    // PREFIX COMMAND
    async executePrefix(ctx, args) {
        const targetUser = ctx.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';

        if (!targetUser) {
            return ctx.reply({
                embeds: [warningEmbed('Format Salah', 'Gunakan: `!ban @user [alasan]`')]
            });
        }

        await this.handleLogic(ctx, targetUser, reason, false);
    },

    // LOGIKA UTAMA
    async handleLogic(ctx, targetUser, reason, isSlash) {
        try {
            // cek permission
            if (!ctx.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                const err = errorEmbed(
                    'Akses Ditolak',
                    'Kamu tidak memiliki izin untuk ban member.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // tidak bisa ban diri sendiri
            const authorId = isSlash ? ctx.user.id : ctx.author.id;
            if (targetUser.id === authorId) {
                const warn = warningEmbed(
                    'Gagal',
                    'Kamu tidak bisa mem-ban dirimu sendiri.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [warn], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [warn] });
            }

            // kirim DM
            try {
                const dm = warningEmbed(
                    '🔨 Kamu Telah di-Ban',
                    `Kamu telah diblokir dari **${ctx.guild.name}**.\nAlasan: ${reason}`
                );
                await targetUser.send({ embeds: [dm] });
            } catch {}

            // ban user
            await ctx.guild.members.ban(targetUser.id, {
                reason: `BAN: ${reason}`
            });

            // log
            await sendToLog(
                ctx.guild,
                '🔨 Member Diblokir',
                `Member: ${targetUser.username}\nID: ${targetUser.id}\nAdmin: ${ctx.member.user.username}\nAlasan: ${reason}`,
                '#ED4245'
            );

            // sukses
            const success = successEmbed(
                'Banned Selesai',
                `**${targetUser.username}** berhasil diblokir.\n📝 Alasan: ${reason}`
            );

            return isSlash
                ? ctx.reply({ embeds: [success] })
                : ctx.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR BAN]', error);

            const err = errorEmbed(
                'Gagal',
                'Tidak dapat mem-ban member tersebut.'
            );

            return isSlash
                ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                : ctx.reply({ embeds: [err] });
        }
    }
};