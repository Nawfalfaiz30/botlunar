const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'stop',

    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('🛑 Menghentikan musik dan membersihkan antrean.'),

    async executeSlash(interaction, client) {
        await this.processStop(
            interaction,
            interaction.member,
            interaction.guild,
            true,
            client
        );
    },

    async executePrefix(message, args, client) {
        await this.processStop(
            message,
            message.member,
            message.guild,
            false,
            client
        );
    },

    async processStop(context, member, guild, isSlash, client) {
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const err = errorEmbed(
                'Akses Ditolak',
                'Kamu harus berada di Voice Channel untuk menggunakan ini!'
            );

            return isSlash
                ? await context.reply({ embeds: [err], ephemeral: true })
                : await context.reply({ embeds: [err] });
        }

        const queue = client.distube.getQueue(guild.id);

        if (!queue) {
            const err = errorEmbed(
                'Antrean Kosong',
                'Lunar sedang tidak memutar musik apa pun.'
            );

            // Kalau bot masih di VC tapi queue kosong → disconnect 10 detik
            const botVoice = guild.members.me.voice.channel;

            if (botVoice) {
                setTimeout(() => {
                    const latestQueue = client.distube.getQueue(guild.id);

                    if (!latestQueue) {
                        botVoice.leave?.();
                    }
                }, 10000);
            }

            return isSlash
                ? await context.reply({ embeds: [err], ephemeral: true })
                : await context.reply({ embeds: [err] });
        }

        try {
            // Stop musik + clear queue
            await queue.stop();

            const reply = successEmbed(
                '🛑 Musik Dihentikan',
                'Pemutaran dibatalkan dan seluruh antrean telah dibersihkan.'
            );

            isSlash
                ? await context.reply({ embeds: [reply] })
                : await context.reply({ embeds: [reply] });

            // Delay 10 detik sebelum disconnect
            setTimeout(() => {
                const latestQueue = client.distube.getQueue(guild.id);

                // Kalau masih tidak ada queue, keluar VC
                if (!latestQueue && guild.members.me.voice.channel) {
                    queue.voice.leave();
                }
            }, 5000);

        } catch (error) {
            console.error('[ERROR STOP]', error);

            const errReply = errorEmbed(
                'Gagal Berhenti',
                'Sistem gagal menghentikan musik. Coba putuskan koneksi bot secara manual.'
            );

            return isSlash
                ? await context.reply({
                      embeds: [errReply],
                      ephemeral: true
                  })
                : await context.reply({
                      embeds: [errReply]
                  });
        }
    }
};