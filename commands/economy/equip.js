const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal agar tetap cepat
const itemsDb = require('../../data/items.json');
const shopDb = require('../../data/shop.json');
const allItems = { ...itemsDb, ...shopDb };

// Fungsi pembantu untuk menentukan slot berdasarkan tipe dan nama item
function determineSlot(item) {
    if (item.type === 'weapon') return 'weapon';
    if (item.type === 'armor') return 'armor';
    if (item.type === 'tool') {
        const name = item.nama.toLowerCase();
        if (name.includes('pancing') || name.includes('perahu') || name.includes('nelayan')) return 'pancing';
        if (name.includes('pickaxe')) return 'pickaxe';
        if (name.includes('kapak')) return 'kapak';
    }
    return null;
}

module.exports = {
    name: 'equip',
    aliases: ['unequip'],
    data: new SlashCommandBuilder()
        .setName('equip')
        .setDescription('🛡️ Memakai atau melepas senjata, armor, maupun alat (tools).')
        .addStringOption(option => 
            option.setName('aksi')
                .setDescription('Contoh: "Pedang" (Equip) atau "lepas pancing" (Unequip)')
                .setRequired(true)
        ),

    async executeSlash(interaction) { await this.processEquip(interaction, interaction.user, interaction.options.getString('aksi'), true); },
    async executePrefix(message, args) {
        if (!args.length) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!equip <nama barang>` atau `lunar!unequip <weapon/armor/pancing/pickaxe/kapak>`')] });
        
        const isUnequip = message.content.toLowerCase().includes('unequip');
        const query = isUnequip ? 'lepas ' + args.join(' ') : args.join(' ');
            
        await this.processEquip(message, message.author, query, false);
    },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processEquip(context, user, queryName, isSlash) {
        try {
            // 1. Ambil Data dari MongoDB
            const userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [errorEmbed('Error', 'Profil belum terdaftar.')] });

            const query = this.normalize(queryName);
            if (!userData.gear) userData.gear = { weapon: null, armor: null, pancing: null, pickaxe: null, kapak: null };

            // ==========================================
            // FITUR UNEQUIP
            // ==========================================
            if (query.includes('lepas')) {
                let slot = null;
                if (query.includes('armor') || query.includes('baju')) slot = 'armor';
                else if (query.includes('weapon') || query.includes('senjata')) slot = 'weapon';
                else if (query.includes('pancing') || query.includes('perahu')) slot = 'pancing';
                else if (query.includes('pickaxe')) slot = 'pickaxe';
                else if (query.includes('kapak')) slot = 'kapak';
                
                if (!slot) return context.reply({ embeds: [warningEmbed('Salah Format', 'Tentukan apa yang ingin dilepas: `weapon`, `armor`, `pancing`, `pickaxe`, atau `kapak`.')] });

                const equippedItem = userData.gear[slot];
                if (!equippedItem) return context.reply({ embeds: [warningEmbed('Kosong', `Slot **${slot}** kamu sedang tidak terpakai.`)] });

                // Ambil data item untuk mengembalikan stat
                const itemData = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(equippedItem));
                
                // Masukkan balik ke inventory
                userData.inventory.push(equippedItem);
                
                // Kurangi Stats
                if (itemData?.stats) {
                    userData.stats.attack = (userData.stats.attack || 0) - (itemData.stats.attack || 0);
                    userData.stats.defense = (userData.stats.defense || 0) - (itemData.stats.defense || 0);
                }
                
                userData.gear[slot] = null;
                await userData.save(); // 🟢 Simpan perubahan

                return context.reply({ embeds: [successEmbed('Berhasil', `Melepas **${equippedItem}** dari slot ${slot}.`)] });
            }

            // ==========================================
            // FITUR EQUIP
            // ==========================================
            const inventory = userData.inventory || [];
            const itemIndex = inventory.findIndex(item => this.normalize(item).includes(query));

            if (itemIndex === -1) return context.reply({ embeds: [errorEmbed('Tidak Ditemukan', `Kamu tidak memiliki "${queryName}" di tas.`)] });

            const realItemName = inventory[itemIndex];
            const itemDetails = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(realItemName));

            if (!itemDetails) return context.reply({ embeds: [errorEmbed('Error', `Data untuk **${realItemName}** tidak ditemukan di database.`)] });
            
            const slot = determineSlot(itemDetails);

            if (!slot) return context.reply({ embeds: [warningEmbed('Gagal', `**${realItemName}** bukan merupakan perlengkapan atau alat yang bisa di-equip.`)] });

            // CEK SWAP
            if (userData.gear[slot] !== null) {
                return context.reply({ embeds: [warningEmbed('Slot Penuh', `Kamu sudah memakai **${userData.gear[slot]}**. Silakan ketik \`lunar!unequip ${slot}\` terlebih dahulu.`)] });
            }

            // EKSEKUSI EQUIP
            userData.inventory.splice(itemIndex, 1);
            userData.gear[slot] = realItemName;
            
            // Tambahkan stat dasar
            userData.stats.attack = (userData.stats.attack || 0) + (itemDetails.stats?.attack || 0);
            userData.stats.defense = (userData.stats.defense || 0) + (itemDetails.stats?.defense || 0);

            await userData.save(); // 🟢 Simpan perubahan

            let msgDesc = `Kamu memakai **${realItemName}** di slot **${slot}**.\n`;
            if (itemDetails.stats?.attack || itemDetails.stats?.defense) {
                msgDesc += `Stats: ATK ${userData.stats.attack} | DEF ${userData.stats.defense}`;
            } else if (itemDetails.deskripsi) {
                msgDesc += `*${itemDetails.deskripsi}*`;
            }

            return context.reply({ embeds: [successEmbed('🛡️ Perlengkapan Dipakai', msgDesc)] });

        } catch (error) {
            console.error('[ERROR EQUIP MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan saat mengatur perlengkapan.')] });
        }
    }
};