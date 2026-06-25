const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'ship',
    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('❤️ Menghitung persentase kecocokan antara dua orang.')
        .addUserOption(option => option.setName('user1').setDescription('Orang pertama').setRequired(true))
        .addUserOption(option => option.setName('user2').setDescription('Orang kedua').setRequired(true)),

    async executeSlash(interaction, client) {
        await this.processShip(interaction, interaction.options.getUser('user1'), interaction.options.getUser('user2'), true);
    },

    async executePrefix(message, args, client) {
        const user1 = message.mentions.users.at(0);
        const user2 = message.mentions.users.at(1);

        if (!user1 || !user2) return message.reply({ embeds: [warningEmbed('Format Salah', 'Tag 2 orang! Contoh: `!ship @Budi @Siti`')] });
        await this.processShip(message, user1, user2, false);
    },

    async processShip(context, user1, user2, isSlash) {
        // Angka random 1 - 100
        const percentage = Math.floor(Math.random() * 100) + 1;
        
        let bar = '';
        const filled = Math.round(percentage / 10);
        for (let i = 0; i < 10; i++) { bar += i < filled ? '🟥' : '⬛'; }

        let komentar = '';
        if (percentage >= 90) komentar = 'Sangat Cocok! Langsung ke pelaminan aja! 💍';
        else if (percentage >= 70) komentar = 'Potensi pasangan yang bagus! 🥰';
        else if (percentage >= 40) komentar = 'Bisa jadi teman yang baik... 🤝';
        else komentar = 'Mending cari yang lain deh... 💔';

        const embed = baseEmbed(
            '❤️ Love Calculator ❤️',
            `**${user1.username}**  x  **${user2.username}**\n\n**Kecocokan:** ${percentage}%\n${bar}\n\n*${komentar}*`,
            '#EB459E'
        );

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};