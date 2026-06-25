const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'removerole',
    aliases: ['rvr'],

    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('🛡️ [ADMIN] Mencabut role dari member.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member')
                .setRequired(true)
        )
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('Role yang ingin dicabut')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan pencabutan role')
        ),

    // SLASH COMMAND
    async executeSlash(ctx) {
        const targetUser = ctx.options.getUser('user');
        const role = ctx.options.getRole('role');
        const reason = ctx.options.getString('alasan') || 'Tidak ada alasan';

        await this.handleLogic(ctx, targetUser, role, reason, true);
    },

    // PREFIX COMMAND
    async executePrefix(ctx, args) {
        const targetUser = ctx.mentions.users.first();
        const role = ctx.mentions.roles.first();
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        if (!targetUser || !role) {
            return ctx.reply({
                embeds: [warningEmbed('Format Salah', 'Gunakan: `!removerole @user @role [alasan]`')]
            });
        }

        await this.handleLogic(ctx, targetUser, role, reason, false);
    },

    // LOGIKA UTAMA
    async handleLogic(ctx, targetUser, role, reason, isSlash) {
        try {
            const member = await ctx.guild.members.fetch(targetUser.id);

            // cek apakah member punya role
            if (!member.roles.cache.has(role.id)) {
                const err = errorEmbed(
                    'Gagal',
                    `**${member.user.username}** tidak memiliki role **${role.name}**.`
                );

                return isSlash
                    ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                    : ctx.reply({ embeds: [err] });
            }

            // hapus role
            await member.roles.remove(role, `REMOVEROLE: ${reason}`);

            // log
            await sendToLog(
                ctx.guild,
                '🛡️ Role Dicabut',
                `Member: ${member.user.username}\nRole: ${role.name}\nAdmin: ${ctx.member.user.username}\nAlasan: ${reason}`,
                '#ED4245'
            );

            // sukses
            const success = successEmbed(
                'Role Dicabut',
                `Berhasil mencabut role **${role.name}** dari **${member.user.username}**.`
            );

            return isSlash
                ? ctx.reply({ embeds: [success] })
                : ctx.reply({ embeds: [success] });

        } catch (error) {
            console.error('[ERROR REMOVEROLE]', error);

            const err = errorEmbed(
                'Gagal',
                'Tidak dapat mencabut role. Pastikan role bot lebih tinggi.'
            );

            return isSlash
                ? ctx.reply({ embeds: [err], flags: MessageFlags.Ephemeral })
                : ctx.reply({ embeds: [err] });
        }
    }
};