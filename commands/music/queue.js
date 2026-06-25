const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'queue',
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('🎵 Melihat daftar antrean lagu saat ini.'),

    async executeSlash(interaction, client) {
        await this.processQueue(interaction, interaction.guild.id, true, client);
    },

    async executePrefix(message, args, client) {
        await this.processQueue(message, message.guild.id, false, client);
    },

    async processQueue(context, guildId, isSlash, client) {
        const queue = client.distube.getQueue(guildId);
        if (!queue) {
            const err = errorEmbed('Antrean Kosong', 'Tidak ada lagu yang sedang diputar.');
            return isSlash ? await context.reply({ embeds: [err] }) : await context.reply({ embeds: [err] });
        }

        const qText = queue.songs.map((song, i) => `${i === 0 ? '🎵 **Sedang Diputar:**' : `**${i}.**`} ${song.name} - \`${song.formattedDuration}\``).slice(0, 10).join('\n');
        const embed = baseEmbed(`📑 Antrean Musik: ${queue.songs.length} Lagu`, `${qText}\n\n*Menampilkan maksimal 10 lagu pertama.*`, '#57F287');
        
        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};