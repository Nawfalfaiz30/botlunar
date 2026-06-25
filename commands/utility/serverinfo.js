const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'serverinfo',
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📊 Menampilkan informasi detail tentang server ini.'),

    async executeSlash(interaction, client) {
        await this.showServerInfo(interaction, interaction.guild, true);
    },

    async executePrefix(message, args, client) {
        await this.showServerInfo(message, message.guild, false);
    },

    async showServerInfo(context, guild, isSlash) {
        const owner = await guild.fetchOwner();
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const roles = guild.roles.cache.size;

        const embed = baseEmbed(
            `📊 Informasi Server: ${guild.name}`,
            `Selamat datang di **${guild.name}**! Berikut adalah statistik lengkap server ini.`,
            '#3498db'
        )
        .addFields(
            { name: '👑 Pemilik Server', value: `<@${owner.id}>`, inline: true },
            { name: '👥 Total Member', value: `\`${guild.memberCount} Orang\``, inline: true },
            { name: '📅 Tanggal Dibuat', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '💬 Text Channels', value: `\`${textChannels} Channel\``, inline: true },
            { name: '🎙️ Voice Channels', value: `\`${voiceChannels} Channel\``, inline: true },
            { name: '🛡️ Total Roles', value: `\`${roles} Roles\``, inline: true }
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }));

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};