const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'steam',
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('🎮 Mencari game di Steam Store.')
        .addStringOption(option => option.setName('game').setDescription('Nama game yang ingin dicari').setRequired(true)),

    async executeSlash(interaction, client) {
        await this.processSteam(interaction, interaction.options.getString('game'), true);
    },

    async executePrefix(message, args, client) {
        const game = args.join(' ');
        if (!game) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `!steam [nama game]`')] });
        await this.processSteam(message, game, false);
    },

    async processSteam(context, game, isSlash) {
        const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game)}`;
        const embed = baseEmbed('🎮 Steam Store Search', `Mencari game: **${game}**\n\n🔗 [Klik di sini untuk melihat hasil pencarian di Steam](${searchUrl})`, '#171A21')
            .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/512px-Steam_icon_logo.svg.png');

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};