const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { baseEmbed, successEmbed, errorEmbed } = require('./embed.js');

module.exports = {
    /**
     * Inisialisasi sistem musik DisTube
     * @param {import('discord.js').Client} client
     */
    setupMusic(client) {
        try {
            client.distube = new DisTube(client, {
                plugins: [
                    new SpotifyPlugin(),
                    new SoundCloudPlugin(),
                    new YtDlpPlugin({
                        update: false,           // Matikan auto update
                        execArg: ['--no-warnings', '--quiet', '--ignore-errors']    
                    })
                ],

                emitNewSongOnly: true,
                savePreviousSongs: true,
                emitAddSongWhenCreatingQueue: true,
                emitAddListWhenCreatingQueue: true,
            });

            // Event Handlers
            client.distube
                .on('playSong', (queue, song) => {
                    const embed = baseEmbed(
                        '🎵 Sedang Memutar',
                        `**[${song.name}](${song.url})**\n` +
                        `⏱️ **Durasi:** \`${song.formattedDuration}\`\n` +
                        `🎧 **Diminta oleh:** ${song.user}`,
                        '#57F287'
                    ).setThumbnail(song.thumbnail);

                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('addSong', (queue, song) => {
                    const embed = successEmbed(
                        '🎶 Lagu Ditambahkan',
                        `**[${song.name}](${song.url})** telah masuk antrean.`
                    );
                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('addList', (queue, playlist) => {
                    const embed = successEmbed(
                        '📑 Playlist Ditambahkan',
                        `Playlist **${playlist.name}** (${playlist.songs.length} lagu) telah masuk antrean.`
                    );
                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('finish', (queue) => {
                    const embed = baseEmbed('🏁 Antrean Habis', 'Semua lagu telah selesai diputar.', '#FEE75C');
                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('empty', (queue) => {
                    const embed = baseEmbed('📭 Voice Channel Kosong', 'Voice channel kosong.', '#ED4245');
                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('disconnect', (queue) => {
                    const embed = baseEmbed('🔌 Terputus', 'Bot telah keluar dari voice channel.', '#ED4245');
                    queue.textChannel?.send({ embeds: [embed] }).catch(console.error);
                })

                .on('error', (error, queue) => {
                    console.error('[DISTUBE ERROR]', error);
                    if (!queue?.textChannel) return;

                    const embed = errorEmbed(
                        '❌ Gangguan Pemutaran',
                        error.message?.slice(0, 1500) || 'Terjadi kesalahan saat memutar musik.'
                    );
                    queue.textChannel.send({ embeds: [embed] }).catch(console.error);
                });

            console.log('✅ [SISTEM] DisTube Music Helper berhasil diinisialisasi.');
        } catch (err) {
            console.error('❌ [ERROR] Gagal menginisialisasi DisTube:', err);
        }
    }
};