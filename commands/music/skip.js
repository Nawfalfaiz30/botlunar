const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'skip',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('⏭️ Melewati lagu yang sedang diputar ke lagu berikutnya.'),

    async executeSlash(interaction, client) {
        await this.processSkip(interaction, interaction.member, interaction.guild, true, client);
    },

    async executePrefix(message, args, client) {
        await this.processSkip(message, message.member, message.guild, false, client);
    },

    async processSkip(context, member, guild, isSlash, client) {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            const err = errorEmbed('Akses Ditolak', 'Kamu harus berada di Voice Channel untuk menggunakan ini!');
            return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
        }

        // Mengambil data antrean (queue) di server ini
        const queue = client.distube.getQueue(guild.id);
        if (!queue) {
            const err = errorEmbed('Antrean Kosong', 'Tidak ada lagu yang sedang diputar saat ini.');
            return isSlash ? await context.reply({ embeds: [err], ephemeral: true }) : await context.reply({ embeds: [err] });
        }

        try {
            // Jika ini lagu terakhir, skip akan menyebabkan error di DisTube, jadi kita stop saja
            if (queue.songs.length === 1 && !queue.autoplay) {
                await queue.stop();
                const reply = successEmbed('⏭️ Lagu Dilewati', 'Karena tidak ada lagu lagi di antrean, pemutaran dihentikan.');
                return isSlash ? await context.reply({ embeds: [reply] }) : await context.reply({ embeds: [reply] });
            }

            // Melewati lagu
            await queue.skip();
            const reply = successEmbed('⏭️ Lagu Dilewati', 'Memutar lagu selanjutnya di antrean...');
            return isSlash ? await context.reply({ embeds: [reply] }) : await context.reply({ embeds: [reply] });

        } catch (error) {
            console.error('[ERROR SKIP]', error);
            const errReply = errorEmbed('Gagal Skip', 'Terjadi kesalahan saat mencoba melewati lagu.');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.reply({ embeds: [errReply] });
        }
    }
};