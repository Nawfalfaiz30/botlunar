const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const Guild = require('../../models/guildSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'antispam',
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('🛡️ [ADMIN] Menghidupkan atau mematikan sistem Anti-Spam.')
        .addStringOption(option => 
            option.setName('status')
                .setDescription('Status sistem')
                .setRequired(true)
                .addChoices({ name: '🟢 On', value: 'on' }, { name: '🔴 Off', value: 'off' })
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Akses Ditolak.', ephemeral: true });
        }
        await this.processAntiSpam(interaction, interaction.guild.id, interaction.options.getString('status'), true);
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        const status = args[0]?.toLowerCase();
        if (status !== 'on' && status !== 'off') {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `!antispam on` atau `!antispam off`')] });
        }
        await this.processAntiSpam(message, message.guild.id, status, false);
    },

    async processAntiSpam(context, guildId, status, isSlash) {
        try {
            // 🟢 MENGGUNAKAN MONGODB (findOneAndUpdate dengan upsert: true)
            // Ini akan membuat entry baru jika server belum ada, atau update jika sudah ada.
            await Guild.findOneAndUpdate(
                { guildId: guildId },
                { antiSpam: (status === 'on') },
                { upsert: true, returnDocument: 'after' }
            );

            const embed = successEmbed(
                `Sistem Anti-Spam: ${status === 'on' ? '🟢 ON' : '🔴 OFF'}`, 
                'Status keamanan server telah diperbarui di database.'
            );
            
            return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR ANTISPAM MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan saat menyimpan pengaturan server.')] });
        }
    }
};