const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'lock',

    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 [ADMIN] Mengunci channel ini agar member biasa tidak bisa chat.')
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

        await this.processLock(interaction, interaction.channel, interaction.guild, true);
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

        await this.processLock(message, message.channel, message.guild, false);
    },

    async processLock(context, channel, guild, isSlash) {
        try {
            const everyoneRole = guild.roles.everyone;

            // Cek apakah channel sudah terkunci
            const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);

            if (currentOverwrite?.deny.has(PermissionsBitField.Flags.SendMessages)) {
                const alreadyLocked = errorEmbed(
                    'Channel Sudah Terkunci',
                    'Channel ini sudah dalam keadaan terkunci.'
                );

                return isSlash
                    ? await context.reply({ embeds: [alreadyLocked], ephemeral: true })
                    : await context.reply({ embeds: [alreadyLocked] });
            }

            // Lock channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });

            const replyMsg = successEmbed(
                '🔒 Channel Terkunci',
                'Channel ini telah dikunci oleh Administrator. Member tidak dapat mengirim pesan sampai dibuka kembali.'
            );

            return isSlash
                ? await context.reply({ embeds: [replyMsg] })
                : await context.reply({ embeds: [replyMsg] });

        } catch (error) {
            console.error('[ERROR LOCK COMMAND]', error);

            const errReply = errorEmbed(
                'Gagal Mengunci Channel',
                'Pastikan bot memiliki izin **Manage Channels** dan role bot berada di atas role member.'
            );

            return isSlash
                ? await context.reply({ embeds: [errReply], ephemeral: true })
                : await context.reply({ embeds: [errReply] });
        }
    }
};