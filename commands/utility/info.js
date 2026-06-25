const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'info',
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('🤖 Menampilkan spesifikasi dan status robot Lunar saat ini.'),

    async executeSlash(interaction, client) {
        await this.showInfo(interaction, client, true);
    },

    async executePrefix(message, args, client) {
        await this.showInfo(message, client, false);
    },

    async showInfo(context, client, isSlash) {
        // Menghitung Uptime bot
        const totalSeconds = (client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeString = `${days} Hari, ${hours} Jam, ${minutes} Menit, ${seconds} Detik`;

        const infoEmbed = baseEmbed(
            `🤖 Spesifikasi & Status Bot Lunar`,
            `Bot multifungsi modern yang dikembangkan untuk mengelola komunitas server.`,
            '#9b59b6'
        )
        .addFields(
            { name: '📡 WebSocket Latency', value: `\`${client.ws.ping}ms\``, inline: true },
            { name: '⏱️ Uptime System', value: `\`${uptimeString}\``, inline: true },
            { name: '⚙️ Platform / Library', value: `\`Node.js ${process.version}\` | \`Discord.js v14\``, inline: false },
            { name: '📊 Statistik Layanan', value: `Serving **${client.guilds.cache.size} Servers**`, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL());

        return isSlash ? await context.reply({ embeds: [infoEmbed] }) : await context.reply({ embeds: [infoEmbed] });
    }
};