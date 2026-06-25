const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'timeout',
    aliases: ['to'],

    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('🛡️ [ADMIN] Membungkam sementara member.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('durasi')
                .setDescription('Durasi timeout (contoh: 3m, 2h, 1d)')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan timeout')
        ),

    // SLASH COMMAND
    async executeSlash(ctx) {
        const targetMember = ctx.options.getMember('user');
        const durationInput = ctx.options.getString('durasi');
        const reason = ctx.options.getString('alasan') || 'Tidak ada alasan';

        await this.handleLogic(ctx, targetMember, durationInput, reason, true);
    },

    // PREFIX COMMAND
    async executePrefix(ctx, args) {
        const targetMember = ctx.mentions.members.first();
        const durationInput = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        if (!targetMember || !durationInput) {
            return ctx.reply({
                embeds: [
                    warningEmbed(
                        'Format Salah',
                        'Gunakan: `!timeout @user [durasi] [alasan]`\nContoh: `!timeout @user 3m spam`'
                    )
                ]
            });
        }

        await this.handleLogic(ctx, targetMember, durationInput, reason, false);
    },

    // PARSE DURASI
    parseDuration(input) {
        const match = input.toLowerCase().match(/^(\d+)(m|h|d)$/);

        if (!match) return null;

        const value = Number(match[1]);
        const unit = match[2];

        if (unit === 'm') return value * 60 * 1000;
        if (unit === 'h') return value * 60 * 60 * 1000;
        if (unit === 'd') return value * 24 * 60 * 60 * 1000;

        return null;
    },

    // LOGIKA UTAMA
    async handleLogic(ctx, targetMember, durationInput, reason, isSlash) {
        try {
            // cek permission
            if (!ctx.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                const err = errorEmbed(
                    'Akses Ditolak',
                    'Kamu tidak memiliki izin untuk timeout member.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // validasi member
            if (!targetMember) {
                const err = errorEmbed(
                    'Gagal',
                    'Member tidak ditemukan.'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // cek apakah bisa di-timeout
            if (!targetMember.moderatable) {
                const err = errorEmbed(
                    'Gagal',
                    `Bot tidak bisa men-timeout **${targetMember.user.username}**.`
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // parse durasi
            const timeoutMs = this.parseDuration(durationInput);

            if (!timeoutMs) {
                const err = errorEmbed(
                    'Durasi Tidak Valid',
                    'Gunakan format: `3m`, `2h`, atau `1d`'
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // timeout
            await targetMember.timeout(
                timeoutMs,
                `TIMEOUT: ${reason}`
            );

            // log
            await sendToLog(
                ctx.guild,
                '🤐 Member Timeout',
                `Member: ${targetMember.user.username}\nDurasi: ${durationInput}\nAdmin: ${ctx.member.user.username}\nAlasan: ${reason}`,
                '#F1C40F'
            );

            // sukses
            const success = successEmbed(
                'Timeout Aktif',
                `**${targetMember.user.username}** telah dibungkam selama **${durationInput}**.\n📝 Alasan: ${reason}`
            );

            return isSlash
                ? ctx.reply({ embeds: [success] })
                : ctx.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR TIMEOUT]', error);

            const err = errorEmbed(
                'Gagal',
                'Tidak dapat melakukan timeout pada member tersebut.'
            );

            return isSlash
                ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                : ctx.reply({ embeds: [err] });
        }
    }
};