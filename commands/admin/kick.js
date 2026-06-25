const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'kick',

    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('🛡️ [ADMIN] Mengeluarkan member dari server.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan kick')
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
                embeds: [warningEmbed('Format Salah', 'Gunakan: `!kick @user [alasan]`')]
            });
        }

        await this.handleLogic(ctx, targetUser, reason, false);
    },

    // LOGIKA UTAMA
    async handleLogic(ctx, targetUser, reason, isSlash) {
        try {
            // cek permission
            if (!ctx.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                const err = errorEmbed(
                    'Akses Ditolak',
                    'Kamu tidak memiliki izin untuk kick member.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // fetch member
            const targetMember = await ctx.guild.members.fetch(targetUser.id);

            // tidak bisa kick diri sendiri
            if (targetMember.id === ctx.member.id) {
                const err = errorEmbed(
                    'Gagal',
                    'Kamu tidak bisa meng-kick dirimu sendiri.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // cek apakah bisa di-kick
            if (!targetMember.kickable) {
                const err = errorEmbed(
                    'Gagal',
                    `Bot tidak bisa meng-kick **${targetUser.username}**. Pastikan role bot lebih tinggi.`
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // kirim DM
            try {
                const dm = warningEmbed(
                    `👢 Kamu Dikeluarkan dari ${ctx.guild.name}`,
                    `Alasan: ${reason}`
                );
                await targetUser.send({ embeds: [dm] });
            } catch {}

            // kick member
            await targetMember.kick(`KICK: ${reason}`);

            // log
            await sendToLog(
                ctx.guild,
                '👢 Member Dikeluarkan',
                `Member: ${targetUser.username}\nID: ${targetUser.id}\nAdmin: ${ctx.member.user.username}\nAlasan: ${reason}`,
                '#F1C40F'
            );

            // sukses
            const success = successEmbed(
                'Kick Berhasil',
                `**${targetUser.username}** berhasil dikeluarkan.\n📝 Alasan: ${reason}`
            );

            return isSlash
                ? ctx.reply({ embeds: [success] })
                : ctx.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR KICK]', error);

            const err = errorEmbed(
                'Gagal',
                'Tidak dapat meng-kick member tersebut.'
            );

            return isSlash
                ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                : ctx.reply({ embeds: [err] });
        }
    }
};