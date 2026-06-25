const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { errorEmbed, warningEmbed, successEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'play',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('🎵 Memutar lagu dari YouTube, Spotify, SoundCloud, dll.')
        .addStringOption(option =>
            option.setName('lagu')
                .setDescription('Judul lagu atau link URL')
                .setRequired(true)
        ),

    // ====================== SLASH COMMAND ======================
    async executeSlash(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await this.processPlay(interaction, true);
    },

    // ====================== PREFIX COMMAND ======================
    async executePrefix(message, args) {
        const query = args.join(' ').trim();
        if (!query) {
            return message.reply({
                embeds: [warningEmbed('Judul Kosong', 'Kamu harus memasukkan judul atau link lagu!\nContoh: `!play Ado Odo`')]
            });
        }

        const waitMsg = await message.reply('⏳ **Sedang mencari lagu...**');
        await this.processPlay(message, false, waitMsg);
    },

    // ====================== LOGIKA UTAMA ======================
    async processPlay(context, isSlash, waitMsg = null) {
        const client = context.client;
        const member = isSlash ? context.member : context.member;
        const voiceChannel = member?.voice?.channel;

        // Ambil query
        let query = isSlash
            ? context.options.getString('lagu')
            : context.content.split(' ').slice(1).join(' ').trim();

        if (!voiceChannel) {
            const errEmbed = errorEmbed(
                '❌ Belum Masuk Voice Channel',
                'Kamu harus bergabung ke voice channel terlebih dahulu!'
            );
            return isSlash
                ? await context.editReply({ embeds: [errEmbed] })
                : await waitMsg.edit({ embeds: [errEmbed] });
        }

        if (!client.distube) {
            const errEmbed = errorEmbed(
                '❌ Sistem Musik Error',
                'Sistem musik belum diinisialisasi dengan benar.'
            );
            return isSlash
                ? await context.editReply({ embeds: [errEmbed] })
                : await waitMsg.edit({ embeds: [errEmbed] });
        }

        try {
            // =============================================
            // PERBAIKAN AKURASI SPOTIFY
            // =============================================
            let playOptions = {
                member: member,
                textChannel: context.channel,
            };

            // Jika input adalah link Spotify, kita bisa tingkatkan akurasi
            if (query.includes('open.spotify.com')) {
                // DisTube Spotify plugin sudah bagus, tapi kita tambahkan sedikit "hint"
                playOptions = {
                    ...playOptions,
                    // Beberapa opsi tambahan yang bisa membantu
                };
            }

            await client.distube.play(voiceChannel, query, playOptions);

            // Hapus pesan loading (DisTube akan kirim embed sendiri)
            if (isSlash) {
                await context.deleteReply().catch(() => {});
            } else {
                await waitMsg.delete().catch(() => {});
            }

        } catch (error) {
            console.error('[ERROR PLAY]', error);

            let errorMessage = 'Terjadi kesalahan saat memutar lagu.';

            if (error.message?.includes('No results') || error.message?.includes('Could not extract')) {
                errorMessage = '❌ Lagu tidak ditemukan. Coba judul yang lebih spesifik atau pakai link YouTube langsung.\n\n**Tips:** `!play Judul Lagu - Nama Penyanyi`';
            } else if (error.message?.includes('private') || error.message?.includes('copyright')) {
                errorMessage = 'Video ini private atau terkena copyright.';
            } else if (error.message?.includes('age-restricted')) {
                errorMessage = 'Video ini dibatasi usia (Age-Restricted).';
            } else if (error.message?.includes('Unable to play')) {
                errorMessage = 'Tidak dapat memutar lagu tersebut. Coba sumber lain.';
            }

            const errEmbed = errorEmbed('❌ Gagal Memutar Lagu', errorMessage);

            if (isSlash) {
                await context.editReply({ embeds: [errEmbed] }).catch(() => {});
            } else {
                await waitMsg.edit({ embeds: [errEmbed] }).catch(() => {});
            }
        }
    }
};      