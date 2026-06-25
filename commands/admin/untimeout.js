const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'untimeout',
    aliases: ['unto'],

    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('🛡️ [ADMIN] Melepaskan timeout dari member.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan melepas timeout (opsional)')
                .setRequired(false)
        ),

    // ====================== SLASH COMMAND ======================
    async executeSlash(ctx) {
        const targetUser = ctx.options.getUser('user');
        const reason = ctx.options.getString('alasan') || 'Tidak ada alasan';

        await this.handleLogic(ctx, targetUser, reason, true);
    },

    // ====================== PREFIX COMMAND ======================
    async executePrefix(ctx, args) {
        const targetUser = ctx.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';

        if (!targetUser) {
            return ctx.reply({
                embeds: [warningEmbed(
                    'Format Salah',
                    'Gunakan: `!untimeout @user [alasan]`'
                )]
            });
        }

        await this.handleLogic(ctx, targetUser, reason, false);
    },

    // ====================== LOGIKA UTAMA ======================
    async handleLogic(ctx, targetUser, reason, isSlash) {
        try {
            // Cek izin
            if (!ctx.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                const err = errorEmbed(
                    'Akses Ditolak',
                    'Kamu tidak memiliki izin untuk melepas timeout.'
                );
                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // Fetch member
            const targetMember = await ctx.guild.members.fetch(targetUser.id);

            // Cek apakah sedang timeout
            if (!targetMember.isCommunicationDisabled()) {
                const warn = warningEmbed(
                    'Gagal',
                    `**${targetUser.username}** tidak sedang di-timeout.`
                );
                return isSlash
                    ? ctx.reply({ embeds: [warn], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [warn] });
            }

            // Lepas timeout
            await targetMember.timeout(null, `UNTIMEOUT oleh ${ctx.member.user.tag} | Alasan: ${reason}`);

            // Kirim Log
            await sendToLog(
                ctx.guild,
                '🔊 Timeout Dilepas',
                `**Member:** ${targetUser.username} (${targetUser.id})\n` +
                `**Admin:** ${ctx.member.user.username}\n` +
                `**Alasan:** ${reason}`,
                '#3498DB'
            );

            // Sukses
            const success = successEmbed(
                '✅ Timeout Dilepas',
                `**${targetUser.username}** telah dilepaskan dari timeout.\n**Alasan:** ${reason}`
            );

            return isSlash
                ? ctx.reply({ embeds: [success] })
                : ctx.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR UNTIMEOUT]', error);

            const err = errorEmbed(
                '❌ Gagal',
                'Tidak dapat melepas timeout member tersebut.\nPastikan bot memiliki izin **Moderate Members** dan role bot lebih tinggi.'
            );

            return isSlash
                ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                : ctx.reply({ embeds: [err] });
        }
    }
};