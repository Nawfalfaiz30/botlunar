const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'imagine',
    data: new SlashCommandBuilder()
        .setName('imagine')
        .setDescription('🎨 Membuat gambar dari teks menggunakan AI.')
        .addStringOption(option => option.setName('prompt').setDescription('Deskripsikan gambar yang ingin dibuat').setRequired(true)),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        await this.generateImage(interaction, interaction.options.getString('prompt'), true);
    },

    async executePrefix(message, args, client) {
        const prompt = args.join(' ');
        if (!prompt) return message.reply({ embeds: [warningEmbed('Prompt Kosong', 'Deskripsikan gambarnya! Contoh: `!imagine kucing terbang di luar angkasa`')] });
        
        const waitMsg = await message.reply('🎨 *Melukis gambar menggunakan AI...*');
        await this.generateImage(message, prompt, false, waitMsg);
    },

    async generateImage(context, prompt, isSlash, waitMsg = null) {
        try {
            // Pollinations.ai membuat gambar secara langsung melalui URL
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

            const embed = baseEmbed(`🎨 AI Image Generator`, `**Prompt:** *"${prompt}"*`, '#3498db').setImage(imageUrl);
            
            return isSlash ? await context.editReply({ embeds: [embed] }) : await waitMsg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('[ERROR IMAGINE]', error);
            if (isSlash) await context.editReply('Gagal membuat gambar.');
            else await waitMsg.edit('Gagal membuat gambar.');
        }
    }
};