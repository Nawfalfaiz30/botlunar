const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');
const { getRandomElement } = require('../../helpers/utils.js');

module.exports = {
    name: 'rps',
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('🎮 Bermain Batu, Gunting, Kertas melawan Lunar!')
        .addStringOption(option => 
            option.setName('pilihan')
                .setDescription('Pilih senjata tanganmu')
                .setRequired(true)
                .addChoices(
                    { name: '🪨 Batu', value: 'batu' },
                    { name: '📄 Kertas', value: 'kertas' },
                    { name: '✂️ Gunting', value: 'gunting' }
                )
        ),

    async executeSlash(interaction, client) {
        const userChoice = interaction.options.getString('pilihan');
        await this.playRPS(interaction, interaction.user, userChoice, true);
    },

    async executePrefix(message, args, client) {
        const userChoice = args[0] ? args[0].toLowerCase() : null;
        const validChoices = ['batu', 'kertas', 'gunting'];

        if (!userChoice || !validChoices.includes(userChoice)) {
            return message.reply({ content: '❌ Pilihan tidak valid! Gunakan: `lunar!rps batu/gunting/kertas`' });
        }

        await this.playRPS(message, message.author, userChoice, false);
    },

    async playRPS(context, user, userChoice, isSlash) {
        const choices = ['batu', 'kertas', 'gunting'];
        const botChoice = getRandomElement(choices);

        const emojis = { batu: '🪨', kertas: '📄', gunting: '✂️' };
        
        let result = '';
        let color = '#2b2d31';

        // Logika Pemenang
        if (userChoice === botChoice) {
            result = '🤝 Seri! Pikiran kita sama.';
            color = '#FEE75C'; // Kuning
        } else if (
            (userChoice === 'batu' && botChoice === 'gunting') ||
            (userChoice === 'kertas' && botChoice === 'batu') ||
            (userChoice === 'gunting' && botChoice === 'kertas')
        ) {
            result = '🎉 Kamu Menang! Lunar mengaku kalah.';
            color = '#57F287'; // Hijau
        } else {
            result = '😎 Lunar Menang! Coba lagi lain kali.';
            color = '#ED4245'; // Merah
        }

        const embed = baseEmbed(
            'Batu, Gunting, Kertas!',
            `**${user.username}:** ${emojis[userChoice]}\n**Lunar:** ${emojis[botChoice]}\n\n**Hasil:** ${result}`,
            color
        );

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};