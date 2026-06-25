const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed, baseEmbed } = require('../../helpers/embed.js');
const { setLogChannel, getLogChannel, removeLogChannel } = require('../../helpers/guildSettings.js');

module.exports = {
    name: 'log',
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('🛡️ [ADMIN] Mengatur channel log moderasi server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('set').setDescription('Set channel log moderasi').addChannelOption(opt => opt.setName('channel').setDescription('Channel tujuan').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub => sub.setName('info').setDescription('Lihat channel log moderasi saat ini'))
        .addSubcommand(sub => sub.setName('remove').setDescription('Hapus channel log moderasi')),

    async executeSlash(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');
        await this.handleLogLogic(interaction, sub, channel, true);
    },

    async executePrefix(message, args, client) {
        const sub = args[0]?.toLowerCase();
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        await this.handleLogLogic(message, sub, channel, false);
    },

    async handleLogLogic(context, sub, channel, isSlash) {
        // Kontrol Akses (Admin Only)
        if (!context.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const err = errorEmbed('Akses Ditolak', 'Perintah ini hanya untuk Administrator!');
            return isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] });
        }

        const guildId = context.guild.id;

        // SUBCOMMAND: SET
        if (sub === 'set') {
            if (!channel) return context.reply({ embeds: [warningEmbed('Input Salah', 'Sebutkan channel tujuan! Contoh: `!log set #log-moderasi`')], ephemeral: isSlash });
            setLogChannel(guildId, channel.id);
            return context.reply({ embeds: [successEmbed('Log Channel Diset', `Log moderasi akan dikirim ke ${channel}`)], ephemeral: isSlash });
        }

        // SUBCOMMAND: INFO
        if (sub === 'info') {
            const channelId = getLogChannel(guildId);
            const logChannel = channelId ? context.guild.channels.cache.get(channelId) : null;
            const desc = logChannel ? `Channel log saat ini: ${logChannel}` : 'Belum ada channel log yang diset.';
            return context.reply({ embeds: [baseEmbed('ℹ️ Log Moderasi', desc, '#3498db')], ephemeral: isSlash });
        }

        // SUBCOMMAND: REMOVE
        if (sub === 'remove') {
            const existing = getLogChannel(guildId);
            if (!existing) return context.reply({ embeds: [warningEmbed('Gagal', 'Belum ada channel log yang diset.')], ephemeral: isSlash });
            removeLogChannel(guildId);
            return context.reply({ embeds: [successEmbed('Log Dihapus', 'Channel log moderasi telah dihapus.')], ephemeral: isSlash });
        }

        // DEFAULT (Jika format salah)
        const format = warningEmbed('Format Salah', 'Gunakan: `!log set #channel`, `!log info`, atau `!log remove`');
        return context.reply({ embeds: [format], ephemeral: isSlash });
    }
};