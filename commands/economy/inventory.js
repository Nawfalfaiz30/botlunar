const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const itemsDb = require('../../data/items.json');
const shopDb = require('../../data/shop.json');
const allItems = { ...itemsDb, ...shopDb };

module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Melihat daftar barang yang ada di tasmu.'),

    async executeSlash(interaction) {
        await this.processInv(interaction, interaction.user, true);
    },

    async executePrefix(message) {
        await this.processInv(message, message.author, false);
    },

    async processInv(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            const userData = await User.findOne({ userId: user.id });

            if (!userData || !userData.inventory || userData.inventory.length === 0) {
                const warn = warningEmbed(
                    '🎒 Tas Kosong',
                    'Kamu belum memiliki barang apa pun di inventory.'
                );
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 2. Hitung jumlah item di dalam inventory
            const itemCounts = {};
            userData.inventory.forEach(item => {
                itemCounts[item] = (itemCounts[item] || 0) + 1;
            });

            // 3. Kategori RPG
            const categories = {
                '🛡️ Equipment (Senjata & Alat)': [],
                '🍎 Consumables (Makanan & Buff)': [],
                '🪵 Materials (Bahan Crafting)': [],
                '📦 Lainnya': []
            };

            // 4. Proses Klasifikasi Berdasarkan Tipe
            for (const [itemName, count] of Object.entries(itemCounts)) {
                let categorized = false;
                const cleanItem = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

                for (const key in allItems) {
                    const itemData = allItems[key];
                    if (!itemData || !itemData.nama) continue;

                    const cleanDb = itemData.nama.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

                    if (cleanItem.includes(cleanDb) || cleanDb.includes(cleanItem)) {
                        const iType = itemData.type || '';

                        if (['equipment', 'weapon', 'armor', 'tool', 'upgrade', 'accessory', 'collectible'].includes(iType)) {
                            categories['🛡️ Equipment (Senjata & Alat)'].push(`🔸 **${itemName}** ×${count}`);
                        } else if (['consumable', 'atk_boost', 'def_boost', 'fish_boost', 'work_boost', 'cooldown_reduce', 'xp_boost', 'shield', 'luck_boost', 'gacha_box', 'gacha_premium', 'vip'].includes(iType)) {
                            categories['🍎 Consumables (Makanan & Buff)'].push(`🔸 **${itemName}** ×${count}`);
                        } else if (iType === 'material') {
                            categories['🪵 Materials (Bahan Crafting)'].push(`🔸 **${itemName}** ×${count}`);
                        } else {
                            categories['📦 Lainnya'].push(`🔸 **${itemName}** ×${count}`);
                        }
                        categorized = true;
                        break;
                    }
                }

                if (!categorized) {
                    categories['📦 Lainnya'].push(`🔸 **${itemName}** ×${count}`);
                }
            }

            // 5. Sortir alfabet agar rapi
            for (const cat in categories) {
                categories[cat].sort();
            }

            const totalItems = Object.values(itemCounts).reduce((a, b) => a + b, 0);
            const uniqueItems = Object.keys(itemCounts).length;

            // 6. Build Embed
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`🎒 Inventory ${user.username}`)
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `📊 **Kapasitas Tas:** ${totalItems} Item\n` +
                    `📦 **Jenis Barang:** ${uniqueItems} Jenis\n` +
                    `━━━━━━━━━━━━━━━━━━`
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Gunakan barang Consumable dengan perintah /heal atau lunar!heal' })
                .setTimestamp();

            for (const [catName, items] of Object.entries(categories)) {
                if (items.length > 0) {
                    embed.addFields({
                        name: `${catName} (${items.length})`,
                        value: items.join('\n'),
                        inline: false
                    });
                }
            }

            return context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR INVENTORY MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat membuka inventory.')] });
        }
    }
};