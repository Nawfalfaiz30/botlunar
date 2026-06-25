const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'genshin',
    data: new SlashCommandBuilder()
        .setName('genshin')
        .setDescription('🎮 Mencari informasi karakter Genshin Impact.')
        .addStringOption(option => option.setName('karakter').setDescription('Nama karakter (Contoh: hutao, zhongli)').setRequired(true)),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.searchGenshin(interaction, interaction.options.getString('karakter'), true);
    },

    async executePrefix(message, args, client) {
        const charName = args.join('');
        if (!charName) return message.reply({ embeds: [warningEmbed('Kosong', 'Masukkan nama karakter! Contoh: `!genshin nahida`')] });
        
        const waitMsg = await message.reply('⏳ *Mencari data ke Teyvat...*');
        await this.searchGenshin(message, charName, false, waitMsg);
    },

    async searchGenshin(context, charName, isSlash, waitMsg = null) {
        try {
            const query = charName.toLowerCase().replace(/\s+/g, '-');
            const response = await fetch(`https://genshin.jmp.blue/characters/${query}`);
            
            if (response.status === 404) {
                const err = errorEmbed('Tidak Ditemukan', `Karakter **${charName}** tidak ditemukan di database.`);
                return isSlash ? await context.editReply({ embeds: [err] }) : await waitMsg.edit({ content: null, embeds: [err] });
            }

            const data = await response.json();
            const embed = baseEmbed(`✨ ${data.name}`, `**Title:** ${data.title || '-'}\n**Deskripsi:** ${data.description}`, '#F1C40F')
                .addFields(
                    { name: '🌟 Rarity', value: `${data.rarity} Star`, inline: true },
                    { name: '⚔️ Senjata', value: `${data.weapon}`, inline: true },
                    { name: '🔥 Vision', value: `${data.vision}`, inline: true },
                    { name: '🌍 Region', value: `${data.nation}`, inline: true }
                )
                .setThumbnail(`https://genshin.jmp.blue/characters/${query}/icon`);

            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('[ERROR GENSHIN]', error);
            const err = errorEmbed('Error', 'Gagal memanggil API Genshin Impact.');
            return isSlash ? await context.editReply({ embeds: [err] }) : await waitMsg.edit({ content: null, embeds: [err] });
        }
    }
};