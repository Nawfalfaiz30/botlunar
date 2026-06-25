const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'unlock',

    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 [ADMIN] Membuka kembali channel agar member bisa chat.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

    async executeSlash(interaction) {
        // Cek permission user
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        'Akses Ditolak',
                        'Kamu tidak memiliki izin untuk mengelola channel!'
                    )
                ],
                ephemeral: true
            });
        }

        await this.processUnlock(interaction, interaction.channel, interaction.guild, true);
    },

    async executePrefix(message) {
        // Cek permission user
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply({
                embeds: [
                    errorEmbed(
                        'Akses Ditolak',
                        'Kamu tidak memiliki izin untuk mengelola channel!'
                    )
                ]
            });
        }

        await this.processUnlock(message, message.channel, message.guild, false);
    },

    async processUnlock(context, channel, guild, isSlash) {
        try {
            const everyoneRole = guild.roles.everyone;

            // Ambil overwrite saat ini
            const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);

            // Cek apakah channel memang sedang dikunci
            const isLocked = currentOverwrite?.deny.has(PermissionsBitField.Flags.SendMessages);

            if (!isLocked) {
                const notLocked = errorEmbed(
                    'Channel Tidak Terkunci',
                    'Channel ini sedang tidak dalam keadaan terkunci.'
                );

                return isSlash
                    ? await context.reply({ embeds: [notLocked], ephemeral: true })
                    : await context.reply({ embeds: [notLocked] });
            }

            // Unlock channel (reset ke inherit/default)
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            });

            const replyMsg = successEmbed(
                '🔓 Channel Terbuka',
                'Channel telah dibuka kembali. Member sekarang dapat mengirim pesan.'
            );

            return isSlash
                ? await context.reply({ embeds: [replyMsg] })
                : await context.reply({ embeds: [replyMsg] });

        } catch (error) {
            console.error('[ERROR UNLOCK COMMAND]', error);

            const errReply = errorEmbed(
                'Gagal Membuka Channel',
                'Pastikan bot memiliki izin **Manage Channels** dan role bot berada di atas role member.'
            );

            return isSlash
                ? await context.reply({ embeds: [errReply], ephemeral: true })
                : await context.reply({ embeds: [errReply] });
        }
    }
};