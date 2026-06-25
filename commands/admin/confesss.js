const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');
const Guild = require('../../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'confess',
    data: new SlashCommandBuilder()
        .setName('confesssetup')
        .setDescription('🎭 [ADMIN] Memasang panel Confess (Pengakuan Anonim).')
        .addChannelOption(option => 
            option.setName('target_channel')
                .setDescription('Channel tempat confess akan dikirimkan dan dipublikasikan')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // ==========================================
    // --- SLASH COMMAND ---
    // ==========================================
    async executeSlash(interaction, client) {
        const targetChannel = interaction.options.getChannel('target_channel');
        await this.processSetup(interaction, targetChannel, true);
    },

    // ==========================================
    // --- PREFIX COMMAND ---
    // ==========================================
    async executePrefix(message, args, client) {
        // Validasi izin admin untuk eksekusi via prefix
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const warnInfo = warningEmbed('Akses Ditolak', '❌ Hanya Administrator yang bisa memasang panel ini.');
            return message.reply({ embeds: [warnInfo] });
        }

        // Ambil mention channel dari argumen pertama (misal: lunar!confesssetup #hasil-confess)
        const targetChannel = message.mentions.channels.first();

        if (!targetChannel) {
            const warnInfo = warningEmbed('Format Salah', 'Kamu harus me-mention (tag) channel tujuan!\nContoh: `lunar!confesssetup #hasil-confess`');
            return message.reply({ embeds: [warnInfo] });
        }

        await this.processSetup(message, targetChannel, false);
    },

    // ==========================================
    // --- LOGIKA UTAMA MEMBUAT PANEL ---
    // ==========================================
    async processSetup(context, targetChannel, isSlash) {
        try {
            // 1. Simpan pengaturan channel tujuan ke database MongoDB
            // Menggunakan upsert: true agar data terbuat otomatis jika server belum terdaftar
            await Guild.findOneAndUpdate(
                { guildId: context.guild.id },
                { confessChannel: targetChannel.id },
                { upsert: true, returnDocument: 'after' }
            );

            // 2. Desain Panel Confess
            const embed = baseEmbed(
                '🎭 Ruang Pengakuan Rahasia (Confess)',
                'Punya rahasia, uneg-uneg, cinta terpendam, atau pesan untuk seseorang tapi malu mengungkapkannya?\n\nKlik tombol di bawah ini untuk membuat channel privat. Pesanmu akan dikirimkan secara **100% Anonim** (tanpa nama asli).',
                '#9B59B6' // Ungu misterius
            );

            const btn = new ButtonBuilder()
                .setCustomId('open_confess')
                .setLabel('🤫 Buat Confess')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(btn);

            // 3. Eksekusi Pengiriman Panel
            if (isSlash) {
                // Kirim panel ke channel tempat command dieksekusi
                await context.channel.send({ embeds: [embed], components: [row] });
                
                // Beri respon rahasia (ephemeral) ke admin yang mengeksekusi
                return context.reply({ 
                    content: `✅ Panel confess berhasil dipasang! Hasil confess dari member nantinya akan dikirim ke ${targetChannel}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            } else {
                // Kirim panel ke channel tempat command dieksekusi
                await context.channel.send({ embeds: [embed], components: [row] });
                
                // Menghapus pesan command (!confesssetup) dari admin agar channel terlihat bersih
                if (typeof context.delete === 'function') {
                    await context.delete().catch(() => {});
                }
            }
        } catch (error) {
            console.error('[ERROR CONFESS SETUP MONGODB]', error);
            if (isSlash) {
                return context.reply({ content: '❌ Terjadi kesalahan saat mengirim dan mengatur panel.', flags: [MessageFlags.Ephemeral] });
            } else {
                return context.channel.send({ content: '❌ Terjadi kesalahan saat mengirim panel confess.' });
            }
        }
    }
};