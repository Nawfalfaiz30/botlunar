const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { baseEmbed, warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'blackjack',
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('🃏 Bermain Blackjack 21 melawan Bandar.')
        .addStringOption(option => 
            option.setName('taruhan')
                .setDescription('Jumlah taruhan (1k, 1m, all)')
                .setRequired(true)
        ),

    // Fungsi Pembantu
    parseBet(betStr, userBalance) {
        if (!betStr) return 0;
        let str = String(betStr).toLowerCase().trim();
        if (str === 'all' || str === 'max') return userBalance;
        let multiplier = 1;
        if (str.endsWith('k')) { multiplier = 1000; str = str.slice(0, -1); }
        else if (str.endsWith('m')) { multiplier = 1000000; str = str.slice(0, -1); }
        let amount = parseFloat(str) * multiplier;
        return (isNaN(amount) || amount <= 0) ? 0 : Math.floor(amount);
    },

    getDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
        return deck.sort(() => Math.random() - 0.5);
    },

    getHandValue(hand) {
        let value = 0;
        let aces = 0;
        for (const card of hand) {
            if (card.value === 'A') { aces += 1; value += 11; }
            else if (['J', 'Q', 'K'].includes(card.value)) { value += 10; }
            else { value += parseInt(card.value); }
        }
        while (value > 21 && aces > 0) { value -= 10; aces -= 1; }
        return value;
    },

    formatHand(hand) {
        return hand.map(card => `\`${card.value}${card.suit}\``).join(' ');
    },

    // ==========================================
    // EXECUTION
    // ==========================================
    async executeSlash(interaction) {
        const betInput = interaction.options.getString('taruhan');
        await this.processBlackjack(interaction, interaction.user, betInput, true);
    },

    async executePrefix(message, args) {
        const betInput = args[0];
        if (!betInput) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!blackjack [taruhan]`')] });
        await this.processBlackjack(message, message.author, betInput, false);
    },

    async processBlackjack(context, user, betInput, isSlash) {
        // 1. Ambil data dari MongoDB
        let userDoc = await User.findOne({ userId: user.id });
        if (!userDoc) userDoc = await User.create({ userId: user.id, koin: 0 });

        const userBalance = userDoc.koin;
        const betAmount = this.parseBet(betInput, userBalance);

        if (betAmount <= 0) return context.reply({ embeds: [errorEmbed('Taruhan Tidak Valid', 'Masukkan jumlah yang benar.')] });
        if (userBalance < betAmount) return context.reply({ embeds: [errorEmbed('Saldo Kurang', 'Saldomu tidak cukup.')] });

        // 2. Tarik saldo (Deduct)
        await User.findOneAndUpdate({ userId: user.id }, { $inc: { koin: -betAmount } });

        let deck = this.getDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        const generateEmbed = (hideDealerCard = true, resultMsg = null, color = '#3498db') => {
            const playerVal = this.getHandValue(playerHand);
            const dealerVal = hideDealerCard ? this.getHandValue([dealerHand[0]]) : this.getHandValue(dealerHand);
            const dealerCards = hideDealerCard ? `${this.formatHand([dealerHand[0]])} \`?❓\`` : this.formatHand(dealerHand);
            
            let desc = `**Taruhan:** 🪙 ${betAmount}\n\n`;
            desc += `🤵 **Bandar (Total: ${dealerVal})**\n${dealerCards}\n\n`;
            desc += `👤 **${user.username} (Total: ${playerVal})**\n${this.formatHand(playerHand)}\n\n`;
            if (resultMsg) desc += `**HASIL:** ${resultMsg}`;

            return baseEmbed('🃏 Blackjack', desc, color);
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Tambahkan (Hit)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('stand').setLabel('Bertahan (Stand)').setStyle(ButtonStyle.Danger)
        );

        const initialMsg = isSlash 
            ? await context.reply({ embeds: [generateEmbed()], components: [row], fetchReply: true }) 
            : await context.reply({ embeds: [generateEmbed()], components: [row] });

        const collector = initialMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: 'Ini bukan permainanmu!', ephemeral: true });

            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                if (this.getHandValue(playerHand) > 21) {
                    collector.stop('busted');
                } else {
                    await i.update({ embeds: [generateEmbed()] });
                }
            } else if (i.customId === 'stand') {
                collector.stop('stand');
            }
        });

        collector.on('end', async (collected, reason) => {
            let resultMsg = '', endColor = '';
            let playerVal = this.getHandValue(playerHand);
            let winAmount = 0;

            if (reason === 'busted') {
                resultMsg = `❌ **Bust!** Kamu kehilangan taruhan.`;
                endColor = '#ED4245';
            } else if (reason === 'time') {
                resultMsg = `⌛ **Waktu habis!** Kamu kalah.`;
                endColor = '#ED4245';
            } else {
                let dealerVal = this.getHandValue(dealerHand);
                while (dealerVal < 17) { dealerHand.push(deck.pop()); dealerVal = this.getHandValue(dealerHand); }

                if (dealerVal > 21 || playerVal > dealerVal) {
                    winAmount = betAmount * 2;
                    resultMsg = `✅ **Menang!** Kamu mendapatkan 🪙 ${winAmount}!`;
                    endColor = '#57F287';
                } else if (playerVal === dealerVal) {
                    winAmount = betAmount;
                    resultMsg = `🤝 **Seri.** Taruhan kembali.`;
                    endColor = '#FEE75C';
                } else {
                    resultMsg = `❌ **Kalah.** Bandar menang.`;
                    endColor = '#ED4245';
                }
            }

            // Update Database: Tambahkan saldo kembali jika menang/seri
            if (winAmount > 0) {
                await User.findOneAndUpdate({ userId: user.id }, { $inc: { koin: winAmount } });
            }
            
            try {
                await initialMsg.edit({ embeds: [generateEmbed(false, resultMsg, endColor)], components: [] });
            } catch (e) {
                if (isSlash) await context.editReply({ embeds: [generateEmbed(false, resultMsg, endColor)], components: [] });
            }
        });
    }
};