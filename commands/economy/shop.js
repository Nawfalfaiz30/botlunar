const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const { removeKoin } = require('../../helpers/economyHelper.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const shopDb = require('../../data/shop.json');

module.exports = {
    name: 'shop',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Toko Lunar: Beli barang untuk bertahan hidup.')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Nama barang yang ingin dibeli')
        ),

    async executeSlash(interaction) { 
        await this.processShop(interaction, interaction.user, interaction.options.getString('item'), true); 
    },
    
    async executePrefix(message, args) { 
        await this.processShop(message, message.author, args.join(' '), false); 
    },

    normalize(text) {
        if (!text) return '';
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processShop(context, user, itemName, isSlash) {
        try {
            // --- 1. MODE BELI LANGSUNG ---
            if (itemName && itemName.trim().length > 0) {
                const query = this.normalize(itemName);
                
                // Cari item berdasarkan nama
                let itemToBuy = Object.values(shopDb).find(item => this.normalize(item.nama) === query) ||
                                Object.values(shopDb).find(item => this.normalize(item.nama).includes(query));
                
                if (!itemToBuy) {
                    return context.reply({ embeds: [errorEmbed('Tidak Ditemukan', `Barang **"${itemName}"** tidak ada di toko.`)] });
                }
                
                // Cek saldo & Proses Pembelian
                // Kita gunakan removeKoin (helper async) untuk memastikan atomicity
                const success = await removeKoin(user.id, itemToBuy.harga);
                
                if (!success) {
                    return context.reply({ embeds: [errorEmbed('Gagal', `Koin tidak cukup untuk membeli **${itemToBuy.nama}**! (Harga: 🪙 ${itemToBuy.harga})`)] });
                }

                // Update Inventory di MongoDB
                const userData = await User.findOne({ userId: user.id });
                const itemString = `${itemToBuy.ikon || '📦'} ${itemToBuy.nama}`;
                if (!userData) {
                    await User.create({
                        userId: user.id,
                        inventory: [itemString]
                    });
                } else {
                    userData.inventory.push(itemString);
                    await userData.save();
                }
                return context.reply({ embeds: [successEmbed('Berhasil!', `Kamu telah membeli ${itemToBuy.ikon || ''} **${itemToBuy.nama}** seharga 🪙 **${itemToBuy.harga}**.`)] });
            }

            // --- 2. MODE KATALOG INTERAKTIF ---
            let currentPage = 0;
            let currentCategory = 'Semua';
            const itemsPerPage = 10;

            const getFilteredItems = (cat) => {
                return Object.values(shopDb)
                    .filter(item => {
                        if (cat === 'Semua') return true;
                        if (cat === 'Senjata') return ['weapon', 'armor', 'equipment'].includes(item.type);
                        if (cat === 'Alat') return ['tool'].includes(item.type);
                        if (cat === 'Consumable') return ['consumable', 'fish_boost', 'work_boost', 'xp_boost', 'cooldown_reduce', 'atk_boost', 'def_boost'].includes(item.type);
                        return ['upgrade', 'vip', 'gacha_box', 'gacha_premium', 'collectible'].includes(item.type);
                    })
                    .sort((a, b) => {
                        const namaA = a.nama || '';
                        const namaB = b.nama || '';

                        const kataPertamaA = namaA.split(' ')[0].toLowerCase();
                        const kataPertamaB = namaB.split(' ')[0].toLowerCase();

                        // Jika awalan sama, urutkan dari harga termurah
                        if (kataPertamaA === kataPertamaB) {
                            return (a.harga || 0) - (b.harga || 0);
                        }

                        // Selain itu urutkan alfabet
                        return namaA.localeCompare(namaB);
                    });
            };

            const generateEmbed = (cat, page) => {
                const items = getFilteredItems(cat);
                const maxPages = Math.ceil(items.length / itemsPerPage) || 1;
                const paginatedItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

                const embed = new EmbedBuilder()
                    .setTitle(`🛒 Toko Lunar | Kategori: ${cat}`)
                    .setColor('#FEE75C')
                    .setDescription('Gunakan `/shop <nama barang>` atau `lunar!shop <nama barang>` untuk membeli.')
                    .setFooter({ text: `Halaman ${page + 1} dari ${maxPages}` });

                paginatedItems.forEach(item => {
                    let statsText = item.stats ? `\n> ⚔️ ATK: ${item.stats.attack || 0} | 🛡️ DEF: ${item.stats.defense || 0}` : "";
                    embed.addFields({
                        name: `${item.ikon || '📦'} ${item.nama} - 🪙 ${item.harga}`,
                        value: `📝 ${item.deskripsi}${statsText}`,
                        inline: false
                    });
                });
                return embed;
            };

            const generateButtons = (cat, page) => {
                const items = getFilteredItems(cat);
                const maxPages = Math.ceil(items.length / itemsPerPage) || 1;
                
                return [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('Semua').setLabel('Semua').setStyle(currentCategory === 'Semua' ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('Senjata').setLabel('Senjata').setStyle(currentCategory === 'Senjata' ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('Alat').setLabel('Alat').setStyle(currentCategory === 'Alat' ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('Consumable').setLabel('Consumable').setStyle(currentCategory === 'Consumable' ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('Lainnya').setLabel('Lainnya').setStyle(currentCategory === 'Lainnya' ? ButtonStyle.Success : ButtonStyle.Secondary)
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPages - 1)
                    )
                ];
            };

            const msg = await context.reply({ 
                embeds: [generateEmbed(currentCategory, currentPage)], 
                components: generateButtons(currentCategory, currentPage),
                fetchReply: true 
            });

            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
            
            collector.on('collect', async i => {
                const userId = context.user?.id || context.author?.id;
                if (i.user.id !== userId) return i.reply({ content: 'Bukan tokomu!', ephemeral: true });
                
                if (i.customId === 'prev') currentPage--;
                else if (i.customId === 'next') currentPage++;
                else {
                    currentCategory = i.customId;
                    currentPage = 0;
                }
                
                await i.update({ 
                    embeds: [generateEmbed(currentCategory, currentPage)], 
                    components: generateButtons(currentCategory, currentPage) 
                });
            });

            collector.on('end', () => {
                msg.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('[ERROR SHOP MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat mengakses toko.')] });
        }
    }
};