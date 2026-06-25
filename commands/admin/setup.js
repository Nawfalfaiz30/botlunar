const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const Guild = require('../../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'setup',
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('🛡️ [ADMIN] Mengatur channel khusus untuk sistem server.')
        .addStringOption(option => 
            option.setName('tipe')
                .setDescription('Pilih sistem yang ingin diatur')
                .setRequired(true)
                .addChoices(
                    { name: '👋 Channel Welcome', value: 'welcomeChannel' },
                    { name: '🚶 Channel Goodbye', value: 'goodbyeChannel' },
                    { name: '📝 Channel Log Moderasi', value: 'logChannel' },
                    { name: '🎫 Kategori Tiket', value: 'ticketCategory' },
                    { name: '🤫 Kategori Confess Privat', value: 'confessCategory' },
                    { name: '📢 Channel Confess Publik', value: 'confessChannel' }, // 🟢 DITAMBAHKAN
                    { name: '⭐ Channel Naik Level', value: 'levelChannel' }
                )
        )
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Pilih channel target atau kategori')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // ====================== SLASH COMMAND ======================
    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang dapat mengatur konfigurasi server!')], 
                ephemeral: true 
            });
        }

        const tipe = interaction.options.getString('tipe');
        const targetChannel = interaction.options.getChannel('channel');

        await this.processSetup(interaction, interaction.guild.id, targetChannel, tipe, true);
    },

    // ====================== PREFIX COMMAND ======================
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ 
                embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki otoritas Administrator!')] 
            });
        }

        const tipeInput = args[0] ? args[0].toLowerCase() : null;
        const channelArg = args[1];
        
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelArg);

        let tipe;
        if (tipeInput === 'welcome') tipe = 'welcomeChannel';
        else if (tipeInput === 'goodbye') tipe = 'goodbyeChannel';
        else if (tipeInput === 'log') tipe = 'logChannel';
        else if (tipeInput === 'ticket') tipe = 'ticketCategory';
        else if (tipeInput === 'confess_cat') tipe = 'confessCategory'; // Kategori privat
        else if (tipeInput === 'confess_pub') tipe = 'confessChannel';   // 🟢 DITAMBAHKAN: Channel publik
        else if (tipeInput === 'level') tipe = 'levelChannel';
        else {
            return message.reply({ 
                embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!setup [welcome/goodbye/log/ticket/confess_cat/confess_pub/level] [#channel/ID_Kategori]`')] 
            });
        }

        if (!targetChannel) {
            return message.reply({ 
                embeds: [warningEmbed('Target Tidak Valid', 'Kamu harus me-mention (tag) channel teks atau memasukkan ID Kategori yang valid.')] 
            });
        }

        // Validasi Tipe Channel
        const isCategoryType = (tipe === 'ticketCategory' || tipe === 'confessCategory');
        
        if (isCategoryType && targetChannel.type !== ChannelType.GuildCategory) {
            return message.reply({ 
                embeds: [warningEmbed('Tipe Tidak Valid', 'Untuk tiket atau ruang confess privat, target harus berupa **Kategori** (masukkan ID Kategori).')] 
            });
        } else if (!isCategoryType && targetChannel.type !== ChannelType.GuildText) {
            return message.reply({ 
                embeds: [warningEmbed('Tipe Tidak Valid', 'Untuk sistem ini, target harus berupa **Channel Teks**.')] 
            });
        }

        await this.processSetup(message, message.guild.id, targetChannel, tipe, false);
    },

    // ====================== LOGIKA UTAMA (MONGODB) ======================
    async processSetup(context, guildId, channel, tipe, isSlash) {
        try {
            // Menggunakan findOneAndUpdate dengan upsert
            // Field yang diupdate diset secara dinamis menggunakan [tipe]
            await Guild.findOneAndUpdate(
                { guildId: guildId },
                { $set: { [tipe]: channel.id } },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );

            // Mapping Nama Tipe untuk Embed
            const namaSistemMap = {
                'welcomeChannel': '👋 Sambutan (Welcome)',
                'goodbyeChannel': '🚶 Perpisahan (Goodbye)',
                'ticketCategory': '🎫 Kategori Tiket',
                'confessCategory': '🤫 Kategori Confess Privat',
                'confessChannel': '📢 Channel Confess Publik',
                'levelChannel': '⭐ Notifikasi Naik Level',
                'logChannel': '📝 Log Moderasi'
            };
            const namaSistem = namaSistemMap[tipe] || 'Sistem';

            const displayTarget = channel.type === ChannelType.GuildCategory ? `Kategori **${channel.name}**` : `<#${channel.id}>`;

            const successReply = successEmbed(
                'Konfigurasi Diperbarui ⚙️', 
                `Sistem **${namaSistem}** telah berhasil dihubungkan ke ${displayTarget}.\n\nSekarang Lunar akan memprioritaskan tempat ini untuk fitur tersebut.`
            );

            return isSlash ? await context.reply({ embeds: [successReply] }) : await context.reply({ embeds: [successReply] });

        } catch (error) {
            console.error('[ERROR SETUP COMMAND MONGODB]', error);
            const errReply = errorEmbed('Gagal Menyimpan', 'Terjadi kesalahan sistem saat mencoba menyimpan konfigurasi ke database.');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.reply({ embeds: [errReply] });
        }
    }
};