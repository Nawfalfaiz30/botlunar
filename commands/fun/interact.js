const { SlashCommandBuilder } = require('discord.js');
const { imageEmbed, warningEmbed } = require('../../helpers/embed.js');
const { getRandomElement } = require('../../helpers/utils.js');

// Database GIF statis agar bot tidak error jika API eksternal mati
const gifs = {
    hug: [
        'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif',
        'https://media.giphy.com/media/lrr9VkGv0CQmY/giphy.gif',
        'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif'
    ],
    pat: [
        'https://media.giphy.com/media/L2z7dnOduqEow/giphy.gif',
        'https://media.giphy.com/media/109ltuoSQT212w/giphy.gif',
        'https://media.giphy.com/media/ye7OTNdZcsYp2/giphy.gif'
    ],
    slap: [
        'https://media.giphy.com/media/Gf3AUz3eA4pDq/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/xUNd9HZq1itMkiK652/giphy.gif'
    ]
};

module.exports = {
    name: 'interact',
    data: new SlashCommandBuilder()
        .setName('interact')
        .setDescription('💬 Lakukan interaksi dengan member lain (peluk, usap, tampar).')
        .addStringOption(option => 
            option.setName('aksi')
                .setDescription('Pilih jenis aksi')
                .setRequired(true)
                .addChoices(
                    { name: '🤗 Peluk (Hug)', value: 'hug' },
                    { name: '👋 Usap Kepala (Pat)', value: 'pat' },
                    { name: '💢 Tampar (Slap)', value: 'slap' }
                )
        )
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih member yang ingin kamu interaksi')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        const action = interaction.options.getString('aksi');
        const target = interaction.options.getUser('target');
        await this.processInteraction(interaction, interaction.user, target, action, true);
    },

    async executePrefix(message, args, client) {
        const validActions = ['hug', 'pat', 'slap'];
        const action = args[0] ? args[0].toLowerCase() : null;
        const target = message.mentions.users.first();

        if (!action || !validActions.includes(action)) {
            return message.reply({ embeds: [warningEmbed('Aksi Salah', 'Pilih aksi yang valid: `hug`, `pat`, atau `slap`.\nContoh: `lunar!interact hug @Budi`')] });
        }
        if (!target) {
            return message.reply({ embeds: [warningEmbed('Target Kosong', 'Kamu harus me-mention seseorang!')] });
        }

        await this.processInteraction(message, message.author, target, action, false);
    },

    async processInteraction(context, user, target, action, isSlash) {
        if (target.id === user.id) {
            return context.reply({ content: 'Kamu tidak bisa melakukan aksi ini ke dirimu sendiri!', ephemeral: true });
        }

        // Memilih teks berdasarkan aksi
        let actionText = '';
        if (action === 'hug') actionText = `🤗 **${user.username}** memeluk erat **${target.username}**!`;
        if (action === 'pat') actionText = `👋 **${user.username}** mengusap kepala **${target.username}** dengan lembut.`;
        if (action === 'slap') actionText = `💢 **${user.username}** menampar **${target.username}**! Aduh!`;

        // Mengambil GIF acak dari daftar yang sesuai dengan aksi
        const randomGif = getRandomElement(gifs[action]);

        const embed = imageEmbed(
            null, // Tanpa judul agar langsung fokus ke teks dan gambar
            actionText,
            randomGif
        );

        return isSlash ? await context.reply({ content: `<@${target.id}>`, embeds: [embed] }) : await context.reply({ content: `<@${target.id}>`, embeds: [embed] });
    }
};