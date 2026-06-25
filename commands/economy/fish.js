const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, successEmbed, errorEmbed } = require('../../helpers/embed.js');
const { formatDuration } = require('../../helpers/utils.js');
const { addXP } = require('../../helpers/economyHelper.js'); // 🟢 Sekarang async
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const fishDb = require('../../data/fish.json');
const shopDb = require('../../data/shop.json');
const itemsDb = require('../../data/items.json');
const allItems = { ...itemsDb, ...shopDb };

module.exports = {
    name: 'fish',
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('🎣 Memancing makhluk air.'),

    async executeSlash(interaction) { await this.processFish(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processFish(message, message.author, false); },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processFish(context, user, isSlash) {
        try {
            // 1. Ambil Data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            // Inisialisasi object cooldowns jika belum ada
            if (!userData.cooldowns) userData.cooldowns = {};
            
            const now = Date.now();

            // 2. CEK ALAT YANG DI-EQUIP
            if (!userData.gear || !userData.gear.pancing) {
                return context.reply({ embeds: [warningEmbed('Tidak Ada Pancingan', 'Kamu harus memakai (equip) **Pancingan** terlebih dahulu! Gunakan `lunar!equip <nama pancingan>`.')] });
            }

            const equippedRod = userData.gear.pancing;
            const rodData = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(equippedRod));

            // 3. MODIFIER SCANNER
            let potongCooldown = 0;
            let bonusRare = 0;
            let extraDrop = 0;

            if (rodData && rodData.modifier) {
                if (rodData.modifier.cooldown_cut) potongCooldown += rodData.modifier.cooldown_cut;
                if (rodData.modifier.rare_chance) bonusRare += rodData.modifier.rare_chance;
                if (rodData.modifier.extra_drop) extraDrop += rodData.modifier.extra_drop;
            }

            // Cek efek aktif dari MongoDB
            const effects = userData.effects instanceof Map ? Object.fromEntries(userData.effects) : (userData.effects || {});
            for (const effectType in effects) {
                const effect = effects[effectType];
                if (effect.expiresAt < now) {
                    delete userData.effects[effectType];
                } else {
                    const sourceItem = Object.values(shopDb).find(i => i.type === effectType);
                    if (sourceItem?.modifier) {
                        if (sourceItem.modifier.cooldown_cut) potongCooldown += sourceItem.modifier.cooldown_cut;
                        if (sourceItem.modifier.rare_chance) bonusRare += sourceItem.modifier.rare_chance;
                        if (sourceItem.modifier.extra_drop) extraDrop += sourceItem.modifier.extra_drop;
                    }
                }
            }

            // 4. COOLDOWN
            const baseCooldown = 3 * 60 * 1000; // 3 Menit
            const cooldown = baseCooldown * (1 - (potongCooldown / 100));
            const lastFish = userData.cooldowns.lastFish || 0;

            if (now - lastFish < cooldown) {
                const timeLeft = cooldown - (now - lastFish);
                return context.reply({ embeds: [warningEmbed('Ikan Kabur', `Tunggu **${formatDuration(timeLeft)}** agar ikan berkumpul lagi.`)] });
            }

            // 5. SISTEM AREA & DROPS
            const playerArea = userData.area || 1;
            const areaFishes = fishDb[playerArea.toString()] || fishDb["1"];
            const spot = areaFishes[Math.floor(Math.random() * areaFishes.length)];

            let dropId = spot.drops[0].id;
            let roll = Math.random() * 100;
            let currentChance = 0;

            for (const drop of spot.drops) {
                let chance = drop.chance;
                if (bonusRare > 0 && drop.id !== spot.drops[0].id) chance += bonusRare; 
                currentChance += chance;
                if (roll <= currentChance) {
                    dropId = drop.id;
                    break;
                }
            }

            const dropItem = itemsDb[dropId] || itemsDb["sepatu_bekas"];

            // 6. EKSEKUSI & SIMPAN
            userData.cooldowns.lastFish = now;
            
            const totalGet = 1 + extraDrop;
            for(let i = 0; i < totalGet; i++) {
                userData.inventory.push(dropItem.nama);
            }
            
            await userData.save(); // Simpan ke MongoDB
            await addXP(user.id, 10); // 🟢 AWAIT: XP update

            let toolMsg = `*(Memakai ${equippedRod})*`;

            const resultEmbed = successEmbed(
                `🎣 Area ${playerArea} | Memancing`,
                `Kamu memancing di **${spot.nama}** dan mendapatkan:\n\n**${dropItem.nama}** ${totalGet > 1 ? `(x${totalGet})` : ''}\n*${dropItem.deskripsi}*\n\n${toolMsg}`
            );

            return context.reply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('[ERROR FISH MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat memancing.')] });
        }
    }
};