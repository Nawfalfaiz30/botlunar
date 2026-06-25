const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, successEmbed } = require('../../helpers/embed.js');
const { formatDuration } = require('../../helpers/utils.js');
const { addXP } = require('../../helpers/economyHelper.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis
const mineDb = require('../../data/mine.json');
const shopDb = require('../../data/shop.json');
const itemsDb = require('../../data/items.json');
const allItems = { ...itemsDb, ...shopDb };

module.exports = {
    name: 'mine',
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('⛏️ Menambang mineral dan batu berharga.'),

    async executeSlash(interaction) { await this.processMine(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processMine(message, message.author, false); },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processMine(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            if (!userData.cooldowns) userData.cooldowns = {};
            const now = Date.now();

            // 2. CEK ALAT (Pickaxe)
            if (!userData.gear || !userData.gear.pickaxe) {
                return context.reply({ embeds: [warningEmbed('Tidak Ada Pickaxe', 'Kamu harus memakai (equip) **Pickaxe** terlebih dahulu! Gunakan `lunar!equip <nama pickaxe>`.')] });
            }

            const equippedPickaxe = userData.gear.pickaxe;
            const pickaxeData = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(equippedPickaxe));

            // 3. MODIFIER SCANNER
            let potongCooldown = 0, bonusRare = 0, extraDrop = 0;

            if (pickaxeData && pickaxeData.modifier) {
                if (pickaxeData.modifier.cooldown_cut) potongCooldown += pickaxeData.modifier.cooldown_cut;
                if (pickaxeData.modifier.rare_chance) bonusRare += pickaxeData.modifier.rare_chance;
                if (pickaxeData.modifier.extra_drop) extraDrop += pickaxeData.modifier.extra_drop;
            }

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
            const baseCooldown = 5 * 60 * 1000;
            const cooldown = baseCooldown * (1 - (potongCooldown / 100));
            const lastMine = userData.cooldowns.lastMine || 0;

            if (now - lastMine < cooldown) {
                const timeLeft = cooldown - (now - lastMine);
                return context.reply({ embeds: [warningEmbed('Kelelahan', `Gua masih runtuh. Tunggu **${formatDuration(timeLeft)}**.`)] });
            }

            // 5. SISTEM AREA & DROPS
            const playerArea = userData.area || 1;
            const areaMines = mineDb[playerArea.toString()] || mineDb["1"];
            const node = areaMines[Math.floor(Math.random() * areaMines.length)];

            let dropId = node.drops[0].id;
            let roll = Math.random() * 100;
            let currentChance = 0;

            for (const drop of node.drops) {
                let chance = drop.chance;
                if (bonusRare > 0 && drop.id !== node.drops[0].id) chance += bonusRare;
                currentChance += chance;
                if (roll <= currentChance) {
                    dropId = drop.id;
                    break;
                }
            }

            const dropItem = itemsDb[dropId] || itemsDb["batu_biasa"];

            // 6. EKSEKUSI
            userData.cooldowns.lastMine = now;
            const totalGet = 1 + extraDrop;
            for (let i = 0; i < totalGet; i++) {
                userData.inventory.push(dropItem.nama);
            }
            
            await userData.save();
            await addXP(user.id, 15); // 🟢 AWAIT: XP update

            let toolMsg = `*(Memakai ${equippedPickaxe})*`;

            const resultEmbed = successEmbed(
                `⛏️ Area ${playerArea} | Menambang`,
                `Kamu memukul **${node.nama}** dan mendapatkan:\n\n**${dropItem.nama}** ${totalGet > 1 ? `(x${totalGet})` : ''}\n*${dropItem.deskripsi}*\n\n${toolMsg}`
            );

            return context.reply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('[ERROR MINE MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan sistem saat menambang.', ephemeral: true });
        }
    }
};