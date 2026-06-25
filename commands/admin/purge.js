const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'purge',
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('🛡️ [ADMIN] Menghapus hingga 100 pesan sekaligus.')
        .addIntegerOption(option => option.setName('jumlah').setDescription('Jumlah pesan yang dihapus (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('Ditolak', 'Kamu tidak memiliki izin Manage Messages!')], ephemeral: true });
        }
        const amount = interaction.options.getInteger('jumlah');
        await this.processPurge(interaction, interaction.channel, amount, true);
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Masukkan angka 1 - 100!\nContoh: `!purge 50`')] });
        }
        await this.processPurge(message, message.channel, amount, false);
    },

    async processPurge(context, channel, amount, isSlash) {
        try {
            const fetched = await channel.messages.fetch({ limit: isSlash ? amount : amount + 1 });
            await channel.bulkDelete(fetched, true);

            const reply = successEmbed('Pesan Dihapus 🧹', `Berhasil membersihkan **${amount}** pesan.`);
            const msg = isSlash ? await context.reply({ embeds: [reply], fetchReply: true }) : await channel.send({ embeds: [reply] });
            
            setTimeout(() => msg.delete().catch(() => {}), 4000);
        } catch (error) {
            console.error('[ERROR PURGE]', error);
            const errReply = errorEmbed('Gagal', 'Pesan yang usianya lebih dari 14 hari tidak bisa dihapus secara massal oleh bot Discord.');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.channel.send({ embeds: [errReply] });
        }
    }
};