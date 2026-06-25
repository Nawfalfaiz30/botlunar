const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'osu',
    data: new SlashCommandBuilder()
        .setName('osu')
        .setDescription('🎮 Mencari profil pemain Osu!')
        .addStringOption(option => option.setName('username').setDescription('Nama pemain Osu!').setRequired(true)),

    async executeSlash(interaction, client) {
        await this.processOsu(interaction, interaction.options.getString('username'), true);
    },

    async executePrefix(message, args, client) {
        const username = args.join(' ');
        if (!username) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `!osu [username]`')] });
        await this.processOsu(message, username, false);
    },

    async processOsu(context, username, isSlash) {
        // Menggunakan link signature otomatis dari lemirq.github.io
        const signatureUrl = `https://lemmmy.pw/osusig/sig.php?colour=hexff66aa&uname=${encodeURIComponent(username)}&pp=1&countryrank=1&flagshadow=1&flagstroke=1&darktriangles=1&onlineindicator=undefined&xpbar=1&xpbarhex=ffffff`;
        const profileUrl = `https://osu.ppy.sh/users/${encodeURIComponent(username)}`;

        const embed = baseEmbed('🎵 Osu! Player Profile', `Klik [di sini](${profileUrl}) untuk melihat profil lengkap **${username}** di website resmi Osu!.`, '#FF66AA')
            .setImage(signatureUrl);

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};