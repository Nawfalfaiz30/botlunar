const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { baseEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'pengumuman',
    data: new SlashCommandBuilder()
        .setName('pengumuman')
        .setDescription('🛡️ [ADMIN] Membuat pengumuman resmi di channel tertentu dengan embed keren.')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Pilih channel target pengumuman')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul utama pengumuman')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('isi')
                .setDescription('Isi pesan pengumuman (gunakan \\n untuk baris baru)')
                .setRequired(true)
        )
        .addRoleOption(option => 
            option.setName('mention')
                .setDescription('Pilih role yang ingin di-ping/mention (opsional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('ping_everyone')
                .setDescription('Apakah ingin melakukan ping @everyone?')
                .setRequired(false)
                .addChoices(
                    { name: 'Ya, Ping @everyone', value: 'everyone' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction, client) {
        // Proteksi keamanan tingkat lanjut
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang dapat membuat pengumuman resmi!')], ephemeral: true });
        }

        const targetChannel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('judul');
        // Mengganti teks \n manual menjadi baris baru asli di JavaScript
        const content = interaction.options.getString('isi').replace(/\\n/g, '\n');
        const targetRole = interaction.options.getRole('mention');
        const pingEveryone = interaction.options.getString('ping_everyone');

        await this.sendAnnouncement(interaction, targetChannel, title, content, targetRole, pingEveryone, true);
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki otoritas Administrator!')] });
        }

        // Format prefix: lunar!pengumuman [#channel] Judul Utama | Isi Pengumuman Panjang
        const targetChannel = message.mentions.channels.first();
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return message.reply({ embeds: [errorEmbed('Format Salah', 'Tag channel teks tujuan terlebih dahulu!\nContoh: `lunar!pengumuman #announcement Judul | Isi`')] });
        }

        // Mengambil sisa teks setelah tag channel
        const textRaw = args.slice(1).join(' ');
        if (!textRaw.includes('|')) {
            return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan tanda pembatas `|` untuk memisahkan Judul dan Isi.\nContoh: `lunar!pengumuman #news Info Penting | Harap baca peraturan baru.`')] });
        }

        const parts = textRaw.split('|');
        const title = parts[0].trim();
        const content = parts[1].trim();

        await this.sendAnnouncement(message, targetChannel, title, content, null, null, false);
    },

    async sendAnnouncement(context, channel, title, content, role, pingEveryone, isSlash) {
        try {
            // Membuat embed utama dengan warna ungu premium (#9b59b6)
            const announceEmbed = baseEmbed(title, content, '#9b59b6');
            
            // Menambahkan info pengirim di bagian atas (Author)
            const sender = isSlash ? context.user : context.author;
            announceEmbed.setAuthor({ 
                name: `Pengumuman Resmi dari ${sender.username}`, 
                iconURL: sender.displayAvatarURL({ dynamic: true }) 
            });

            // Menentukan teks mention (ping) tambahan
            let pingText = '';
            if (pingEveryone === 'everyone') {
                pingText = '@everyone';
            } else if (role) {
                pingText = `<@&${role.id}>`;
            }

            // Mengirimkan ke channel target
            if (pingText) {
                await channel.send({ content: pingText, embeds: [announceEmbed] });
            } else {
                await channel.send({ embeds: [announceEmbed] });
            }

            // Memberikan laporan sukses ke admin yang mengeksekusi perintah
            const successMsg = successEmbed('Pengumuman Terkirim!', `Pesan berhasil dipasang dengan indah di channel ${channel}.`);
            return isSlash ? await context.reply({ embeds: [successMsg], ephemeral: true }) : await context.reply({ embeds: [successMsg] });

        } catch (error) {
            console.error('[ERROR PENGUMUMAN]', error);
            const errReply = errorEmbed('Gagal Mengirim', 'Pastikan Bot Lunar memiliki izin untuk melihat dan mengirim pesan di channel target.');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.reply({ embeds: [errReply] });
        }
    }
};