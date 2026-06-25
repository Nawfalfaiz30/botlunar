const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'verify',
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('🛡️ [ADMIN] Membuat panel tombol verifikasi untuk member baru.')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Role yang akan diberikan (misal: Verified Member)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction, client) {
        const role = interaction.options.getRole('role');
        await this.processVerifyPanel(interaction, role, true);
    },

    async executePrefix(message, args, client) {
        const role = message.mentions.roles.first();
        if (!role) {
            const warnInfo = warningEmbed('Format Salah', 'Kamu harus me-mention (tag) Role target!\nContoh: `!verify @Verified`');
            return message.reply({ embeds: [warnInfo] });
        }
        
        await this.processVerifyPanel(message, role, false);
    },

    async processVerifyPanel(context, role, isSlash) {
        // Validasi Admin
        if (!context.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errMsg = '❌ Hanya Administrator yang bisa membuat panel ini!';
            return isSlash 
                ? context.reply({ content: errMsg, flags: [MessageFlags.Ephemeral] }) 
                : context.reply(errMsg);
        }

        // Kita menyematkan ID Role langsung ke dalam customId tombol
        const verifyButton = new ButtonBuilder()
            .setCustomId(`verify_role_${role.id}`)
            .setLabel('✅ Verifikasi Saya')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(verifyButton);

        const embed = baseEmbed(
            '🛡️ Sistem Verifikasi Keamanan',
            'Untuk menjaga server ini dari bot dan spam, seluruh member diwajibkan untuk melakukan verifikasi.\n\nSilakan baca peraturan server terlebih dahulu, lalu klik tombol **"Verifikasi Saya"** di bawah ini untuk mengonfirmasi bahwa kamu menyetujui seluruh peraturan dan berhak mendapatkan akses penuh ke server.',
            '#57F287' // Hijau Sukses
        );

        if (context.guild.iconURL()) {
            embed.setThumbnail(context.guild.iconURL({ dynamic: true }));
        }

        try {
            if (isSlash) {
                await context.channel.send({ embeds: [embed], components: [row] });
                await context.reply({ content: '✅ Panel verifikasi berhasil dipasang di channel ini!', flags: [MessageFlags.Ephemeral] });
            } else {
                await context.channel.send({ embeds: [embed], components: [row] });
                // Menghapus pesan "!verify" dari admin dengan aman
                if (typeof context.delete === 'function') {
                    await context.delete().catch(() => {});
                }
            }
        } catch (error) {
            console.error('[ERROR VERIFY SETUP]', error);
        }
    }
};