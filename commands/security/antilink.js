const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const Guild = require('../../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'antilink',
    data: new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('🛡️ [ADMIN] Menghidupkan atau mematikan sistem pemblokir tautan (Anti-Link).')
        .addStringOption(option => 
            option.setName('status')
                .setDescription('Pilih status sistem')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Hidupkan (On)', value: 'on' },
                    { name: '🔴 Matikan (Off)', value: 'off' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang bisa mengatur fitur keamanan!')], ephemeral: true });
        }
        
        const status = interaction.options.getString('status');
        await this.processAntilink(interaction, interaction.guild.id, status, true);
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki otoritas Administrator!')] });
        }
        
        const status = args[0] ? args[0].toLowerCase() : null;
        if (status !== 'on' && status !== 'off') {
            const warnInfo = warningEmbed('Format Salah', 'Gunakan perintah: `!antilink on` atau `!antilink off`');
            return message.reply({ embeds: [warnInfo] });
        }
        
        await this.processAntilink(message, message.guild.id, status, false);
    },

    async processAntilink(context, guildId, status, isSlash) {
        try {
            // 1. Update status AntiLink di MongoDB
            // findOneAndUpdate dengan upsert: true akan membuat dokumen baru jika server belum terdaftar
            await Guild.findOneAndUpdate(
                { guildId: guildId },
                { antiLink: (status === 'on') },
                { upsert: true, returnDocument: 'after' }
            );

            // 2. UI Feedback
            const teksStatus = status === 'on' ? '🟢 DIHIDUPKAN' : '🔴 DIMATIKAN';
            const deskripsi = status === 'on' 
                ? 'Member biasa tidak akan bisa lagi mengirimkan link (URL) di server ini. Pesan yang mengandung tautan akan dihapus otomatis.' 
                : 'Sistem sensor dimatikan. Member sekarang diizinkan untuk mengirimkan link (URL) dengan bebas.';

            const replyMsg = successEmbed(`Sistem Keamanan Anti-Link: ${teksStatus}`, deskripsi);
            
            return context.reply({ embeds: [replyMsg] });

        } catch (error) {
            console.error('[ERROR ANTILINK MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat memperbarui konfigurasi server.')] });
        }
    }
};