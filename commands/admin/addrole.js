const { SlashCommandBuilder, PermissionsBitField, MessageFlags, EmbedBuilder } = require('discord.js');
const { modEmbed } = require('../../helpers/embed.js');
const { sendToLog } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'addrole',
    aliases: ['adr'],
    data: new SlashCommandBuilder()     
        .setName('addrole')
        .setDescription('🛡️ [ADMIN] Memberikan role ke member.')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role yang diberikan').setRequired(true))
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pemberian role')),

    // --- SLASH COMMAND ---
    async executeSlash(ctx, client) {
        const targetUser = ctx.options.getUser('user');
        const role = ctx.options.getRole('role');
        const reason = ctx.options.getString('alasan') || 'Tidak ada alasan';
        await this.handleLogic(ctx, targetUser, role, reason, true);
    },

    // --- PREFIX COMMAND ---
    async executePrefix(ctx, args, client) {
        const targetUser = ctx.mentions.users.first();
        const role = ctx.mentions.roles.first();
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        if (!targetUser || !role) {
            const err = modEmbed('❌ Format Salah', 'Gunakan: `!addrole @user @role [alasan]`');
            return ctx.reply({ embeds: [err] });
        }
        await this.handleLogic(ctx, targetUser, role, reason, false);
    },

    // --- LOGIKA UTAMA (DUAL-FUNCTION) ---
    async handleLogic(ctx, targetUser, role, reason, isSlash) {
        // 1. Validasi Izin Admin
        if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const err = modEmbed('🚫 Akses Ditolak', 'Hanya Staff dengan izin Manage Roles yang bisa melakukan ini.');
            return isSlash ? ctx.reply({ embeds: [err], flags: [MessageFlags.Ephemeral] }) : ctx.reply({ embeds: [err] });
        }

        // 2. Fetch Member untuk mendapatkan objek GuildMember
        let targetMember;
        try {
            targetMember = await ctx.guild.members.fetch(targetUser.id);
        } catch (e) {
            const err = modEmbed('❌ Member Tidak Ditemukan', 'Member tersebut tidak ada di server ini.');
            return isSlash ? ctx.reply({ embeds: [err], flags: [MessageFlags.Ephemeral] }) : ctx.reply({ embeds: [err] });
        }

        // 3. Validasi Keamanan (Posisi Role Bot)
        const botMember = ctx.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            const err = modEmbed('⚠️ Role Terlalu Tinggi', 'Role tersebut lebih tinggi/setara dengan role tertinggi bot. Harap pindahkan role bot ke posisi paling atas.');
            return isSlash ? ctx.reply({ embeds: [err], flags: [MessageFlags.Ephemeral] }) : ctx.reply({ embeds: [err] });
        }

        // 4. Eksekusi Tambah Role
        try {
            await targetMember.roles.add(role, `ADDROLE: ${reason}`);
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Role Berhasil Ditambahkan')
                .setDescription(`Role **${role.name}** telah diberikan kepada ${targetMember}`)
                .addFields({ name: '📌 Alasan', value: reason })
                .setTimestamp();

            // Kirim respons ke channel
            await (isSlash ? ctx.reply({ embeds: [successEmbed] }) : ctx.channel.send({ embeds: [successEmbed] }));
            
            // 5. Kirim ke Log
            await sendToLog(
                ctx.guild, 
                '🛡️ Role Ditambahkan', 
                `Member: ${targetMember.user.username}\nRole: ${role.name}\nAdmin: ${ctx.member.user.username}\nAlasan: ${reason}`, 
                '#57F287'
            );
            
        } catch (e) {
            console.error('[ERROR ADDROLE]:', e);
            const err = modEmbed('❌ Gagal', 'Terjadi gangguan internal saat menambahkan role. Periksa izin bot.');
            return isSlash ? ctx.reply({ embeds: [err], flags: [MessageFlags.Ephemeral] }) : ctx.reply({ embeds: [err] });
        }
    }
};
