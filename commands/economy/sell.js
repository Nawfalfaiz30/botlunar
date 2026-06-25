const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const { addKoin } = require('../../helpers/economyHelper.js'); // 🟢 Sekarang async
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const itemsDb = require('../../data/items.json');
const shopDb = require('../../data/shop.json');
const allShopItems = { ...itemsDb, ...shopDb };

module.exports = {
    name: 'sell',
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('💰 Jual barang dari inventory untuk mendapatkan koin.')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Nama barang yang ingin dijual')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah barang yang dijual')
                .setMinValue(1)
        ),

    async executeSlash(interaction) {
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('jumlah') || 1;
        await this.processSell(interaction, interaction.user, item, amount, true);
    },

    async executePrefix(message, args) {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `lunar!sell <nama item> <jumlah>`')] });
        
        let amount = 1;
        const lastArg = args[args.length - 1];
        if (!isNaN(lastArg)) {
            amount = parseInt(args.pop());
        }
        const itemInput = args.join(' ');
        await this.processSell(message, message.author, itemInput, amount, false);
    },

    normalize(text) {
        return text.toLowerCase()
            .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    async processSell(context, user, itemInput, amount, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            const userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            const inv = userData.inventory || [];
            const search = this.normalize(itemInput);

            // 2. Cari Item yang cocok di Database
            let matchedItem = null;
            let matchedItemKey = null;

            for (const key in allShopItems) {
                if (this.normalize(allShopItems[key].nama).includes(search)) {
                    matchedItem = allShopItems[key];
                    matchedItemKey = this.normalize(allShopItems[key].nama);
                    break;
                }
            }

            if (!matchedItem) {
                return context.reply({ embeds: [warningEmbed('Tidak Ditemukan', `Barang **"${itemInput}"** tidak ada dalam daftar jual.`)] });
            }

            // 3. Cek jumlah item di tas (MongoDB Array)
            const ownedIndexes = [];
            let exactNameInInv = "";

            inv.forEach((item, index) => {
                if (this.normalize(item) === matchedItemKey) {
                    ownedIndexes.push(index);
                    exactNameInInv = item; // Ambil nama asli (dengan emoji)
                }
            });

            if (ownedIndexes.length < amount) {
                return context.reply({ embeds: [errorEmbed('Kekurangan Barang', `Kamu hanya punya **${ownedIndexes.length}x**, tapi ingin menjual **${amount}x**.`)] });
            }

            // 4. Proses Jual
            // Hapus item dari array inventory Mongoose
            for (let i = 0; i < amount; i++) {
                const indexToRemove = ownedIndexes.pop();
                userData.inventory.splice(indexToRemove, 1);
            }

            // Hitung harga
            const pricePerItem = matchedItem.harga_jual || Math.floor(matchedItem.harga * 0.5); 
            const totalProfit = pricePerItem * amount;

            // Simpan perubahan ke DB
            await userData.save();
            const newBalance = await addKoin(user.id, totalProfit); // 🟢 AWAIT: update saldo async

            const successMsg = successEmbed(
                'Barang Terjual! 💰', 
                `Berhasil menjual **${amount}x ${exactNameInInv}**.\n\n` +
                `📈 **Keuntungan:** 🪙 ${totalProfit} Koin\n` +
                `💰 **Saldo Sekarang:** 🪙 ${newBalance} Koin`
            );

            return context.reply({ embeds: [successMsg] });

        } catch (error) {
            console.error('[ERROR SELL MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat menjual barang.')] });
        }
    }
};