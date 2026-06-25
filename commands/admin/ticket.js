const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'ticket',
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('🎫 [ADMIN] Mengirim panel pembuatan tiket bantuan.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction, client) {
        await this.sendTicketPanel(interaction, true);
    },

    async executePrefix(message, args, client) {
        await this.sendTicketPanel(message, false);
    },

    async sendTicketPanel(context, isSlash) {
        // Validasi izin
        if (!context.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errMsg = 'Hanya Administrator yang bisa mengirim panel tiket.';
            return isSlash 
                ? context.reply({ content: errMsg, flags: [MessageFlags.Ephemeral] }) 
                : context.reply(errMsg);
        }

        const embed = baseEmbed(
            '✨ 🎫 Pusat Bantuan Khusus',
            'Jika kamu memiliki pertanyaan, masalah, atau butuh bantuan staf secara privat, silakan klik tombol di bawah ini.\n\nSistem akan membuatkan ruangan obrolan rahasia antara kamu dan staf server.',
            '#5865F2'
        );

        const btn = new ButtonBuilder()
            .setCustomId('open_ticket')
            .setLabel('📩 Buka Tiket')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(btn);

        if (isSlash) {
            await context.reply({ embeds: [embed], components: [row] });
        } else {
            await context.channel.send({ embeds: [embed], components: [row] });
            
            // Perbaikan Hapus Pesan Aman
            try {
                if (typeof context.delete === 'function') {
                    await context.delete().catch(() => {});
                }
            } catch (err) {
                // Abaikan jika tidak bisa dihapus (misal bot tidak punya izin manage messages)
            }
        }
    }
};