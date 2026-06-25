const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'volume',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('🔊 Mengubah volume pemutar musik.')
        .addIntegerOption(option => option.setName('angka').setDescription('Volume (1 - 100)').setRequired(true).setMinValue(1).setMaxValue(100)),

    async executeSlash(interaction, client) {
        const vol = interaction.options.getInteger('angka');
        await this.processVolume(interaction, interaction.guild.id, interaction.member, vol, true, client);
    },

    async executePrefix(message, args, client) {
        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 1 || vol > 100) return message.reply({ embeds: [warningEmbed('Format Salah', 'Masukkan angka 1-100! Contoh: `!volume 50`')] });
        await this.processVolume(message, message.guild.id, message.member, vol, false, client);
    },

    async processVolume(context, guildId, member, vol, isSlash, client) {
        const queue = client.distube.getQueue(guildId);
        if (!queue) return context.reply({ embeds: [errorEmbed('Antrean Kosong', 'Tidak ada lagu yang sedang diputar.')], ephemeral: isSlash });
        if (!member.voice.channel) return context.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu harus berada di Voice Channel.')], ephemeral: isSlash });

        queue.setVolume(vol);
        const embed = successEmbed('Volume Diubah 🔊', `Volume musik telah diatur ke **${vol}%**.`);
        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};