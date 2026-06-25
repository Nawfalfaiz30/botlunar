const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const { readJSON } = require('../../helpers/utils.js');
const { addXP } = require('../../helpers/economyHelper.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const recipesDb = require('../../data/recipes.json');
const itemsDb = require('../../data/items.json'); 

module.exports = {
    name: 'cook',
    data: new SlashCommandBuilder()
        .setName('cook')
        .setDescription('👩🏻‍🍳 Memasak hidangan lezat menggunakan bahan baku.')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Nama makanan yang ingin dibuat')
                .setRequired(true)
        ),

    async executeSlash(interaction) { await this.processCook(interaction, interaction.user, interaction.options.getString('item'), true); },
    async executePrefix(message, args) {
        if (!args.length) return message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!cook <nama makanan>`')] });
        await this.processCook(message, message.author, args.join(' '), false);
    },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processCook(context, user, queryName, isSlash) {
        // 1. Ambil Data User dari MongoDB
        const userData = await User.findOne({ userId: user.id });
        if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });

        // 2. CARI RESEP
        const cleanQuery = this.normalize(queryName);
        let targetRecipe = null;

        for (const recipe of Object.values(recipesDb)) {
            if (this.normalize(recipe.hasil).includes(cleanQuery)) {
                targetRecipe = recipe;
                break;
            }
        }

        if (!targetRecipe) return context.reply({ embeds: [errorEmbed('Resep Tidak Ditemukan', `Tidak ada resep untuk **${queryName}**.`)] });

        // 3. CEK MATERIAL DI INVENTORY (MongoDB)
        const inventory = userData.inventory || [];
        const missingItems = [];
        const requirementKeys = Object.keys(targetRecipe.bahan);

        for (const bahan of requirementKeys) {
            const reqQty = targetRecipe.bahan[bahan];
            const ownedQty = inventory.filter(item => this.normalize(item) === this.normalize(bahan)).length;
            
            if (ownedQty < reqQty) {
                missingItems.push(`❌ ${bahan}: **${ownedQty} / ${reqQty}**`);
            } else {
                missingItems.push(`✅ ${bahan}: **${ownedQty} / ${reqQty}**`);
            }
        }

        if (missingItems.some(i => i.startsWith('❌'))) {
            return context.reply({ embeds: [errorEmbed('Bahan Tidak Cukup', `Kamu kekurangan bahan baku:\n${missingItems.join('\n')}`)] });
        }

        // 4. POTONG MATERIAL (Simulasi update array inventory)
        for (const bahan of requirementKeys) {
            const reqQty = targetRecipe.bahan[bahan];
            let removed = 0;
            for (let i = inventory.length - 1; i >= 0; i--) {
                if (this.normalize(inventory[i]) === this.normalize(bahan) && removed < reqQty) {
                    inventory.splice(i, 1);
                    removed++;
                }
            }
        }

        // 5. TAMBAHKAN STATS PERMANEN (MongoDB Document Update)
        const resultItem = Object.values(itemsDb).find(i => this.normalize(i.nama) === this.normalize(targetRecipe.hasil));
        let statBonusText = "";

        if (resultItem && resultItem.stats) {
            const stats = resultItem.stats;
            
            // Update stats di objek MongoDB (Mongoose akan melacak perubahan ini)
            userData.stats.attack = (userData.stats.attack || 0) + (stats.attack || 0);
            userData.stats.defense = (userData.stats.defense || 0) + (stats.defense || 0);
            
            if (stats.hp) {
                userData.stats.maxHp = (userData.stats.maxHp || 0) + stats.hp;
                userData.stats.hp = (userData.stats.hp || 0) + stats.hp;
            }

            const parts = [];
            if (stats.attack) parts.push(`ATK +${stats.attack}`);
            if (stats.defense) parts.push(`DEF +${stats.defense}`);
            if (stats.hp) parts.push(`HP +${stats.hp}`);
            statBonusText = parts.length > 0 ? `\n\n**Stat Bonus Permanen:** ${parts.join(', ')}` : "";
        }

        // Simpan perubahan ke MongoDB
        userData.inventory = inventory;
        await userData.save();
        
        await addXP(user.id, 12);

        // 6. TAMPILKAN HASIL
        const success = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('👩🏻‍🍳 Masakan Selesai!')
            .setDescription(`Aroma sedap tercium! Kamu berhasil memasak **${targetRecipe.hasil}** dan langsung melahapnya.${statBonusText}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        return context.reply({ embeds: [success] });
    }
};