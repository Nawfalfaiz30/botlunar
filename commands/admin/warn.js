const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/warnSchema.js'); // 🟢 Menghubungkan ke MongoDB

module.exports = {
    name: 'warn',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('🛡️ [ADMIN] Memberikan peringatan kepada member.')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Target member yang akan ditegur')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('alasan')
                .setDescription('Alasan teguran')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
            // 🟢 JALAN KELUAR TIMEOUT: Beritahu Discord untuk menunggu proses database
            await interaction.deferReply().catch(() => {});

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('alasan');
            
            await this.handleWarn(interaction, targetUser, reason, interaction.user, interaction.guild, true);
        } catch (err) {
            console.error('[ERROR SLASH TEKNIS]', err);
        }
    },

    // ==========================================
    // PREFIX COMMAND HANDLER
    // ==========================================
    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first();
        const reason = args.slice(1).join(' ');

        if (!targetUser || !reason) {
            return message.reply('❌ **Format Salah:** Gunakan `!warn @user [alasan]`');
        }

        // Cek izin admin untuk versi prefix
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.');
        }

        await this.handleWarn(message, targetUser, reason, message.author, message.guild, false);
    },

    // ==========================================
    // LOGIKA UTAMA (MONGODB)
    // ==========================================
    async handleWarn(ctx, targetUser, reason, author, guild, isSlash) {
        try {
            // 1. Validasi Pencegahan Error
            if (targetUser.id === author.id) {
                const msg = '❌ Kamu tidak bisa memberi peringatan pada dirimu sendiri.';
                return isSlash ? ctx.editReply({ content: msg }) : ctx.reply(msg);
            }
            if (targetUser.bot) {
                const msg = '❌ Bot tidak bisa diberi peringatan.';
                return isSlash ? ctx.editReply({ content: msg }) : ctx.reply(msg);
            }

            // 2. Operasi Baca & Tulis ke MongoDB
            let userWarns = await Warning.findOne({ guildId: guild.id, userId: targetUser.id });
            
            if (!userWarns) {
                userWarns = new Warning({ guildId: guild.id, userId: targetUser.id, warnings: [] });
            }

            // Tambahkan data warn baru
            userWarns.warnings.push({ reason: reason, moderatorId: author.id });
            
            // Simpan ke database Cloud
            await userWarns.save();
            const totalWarns = userWarns.warnings.length;

            // 3. Buat Desain Tampilan (Embed)
            const successEmbed = new EmbedBuilder()
                .setColor('#E74C3C') 
                .setTitle('⚠️ Member Diberi Peringatan')
                .setDescription(`Telah mencatat peringatan untuk **${targetUser.tag || targetUser.username}**.`)
                .addFields(
                    { name: 'Alasan', value: reason, inline: true },
                    { name: 'Total Peringatan', value: `${totalWarns} Kali`, inline: true }
                )
                .setFooter({ text: `Moderator: ${author.tag || author.username}` })
                .setTimestamp();

            // 4. Kirim Balasan ke Server (Menggunakan editReply jika Slash Command)
            if (isSlash) {
                await ctx.editReply({ embeds: [successEmbed] });
            } else {
                await ctx.reply({ embeds: [successEmbed] });
            }

            // 5. Kirim Pesan Pribadi (DM) ke Target
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFCC00')
                    .setTitle(`⚠️ Peringatan dari Server: ${guild.name}`)
                    .setDescription(`Kamu mendapat teguran dari moderator.\n\n**Alasan:** ${reason}\n**Total Pelanggaran:** ${totalWarns}`);
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (err) {
                // Abaikan jika target mematikan fitur DM
            }

        } catch (error) {
            console.error('[ERROR WARN MONGODB FATAL]', error);
            const errMsg = '❌ Terjadi kesalahan fatal saat menyimpan data ke MongoDB.';
            return isSlash ? ctx.editReply({ content: errMsg }) : ctx.reply(errMsg);
        }
    }
};