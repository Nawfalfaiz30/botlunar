const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const { formatDuration } = require('../../helpers/utils.js');
const { addXP } = require('../../helpers/economyHelper.js'); // 🟢 Sekarang async
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const huntDb = require('../../data/hunt.json');
const shopDb = require('../../data/shop.json');
const itemsDb = require('../../data/items.json');

function createProgressBar(current, max, size = 10) {
    if (max <= 0) return '░'.repeat(size);
    const progress = Math.round((current / max) * size);
    const filled = progress > size ? size : progress;
    const empty = size - filled < 0 ? 0 : size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'hunt',
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('🏹 Masuk ke area berburu untuk bertarung melawan monster.'),

    async executeSlash(interaction) { await this.processHunt(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processHunt(message, message.author, false); },

    async processHunt(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            // Inisialisasi object cooldowns jika belum ada
            if (!userData.cooldowns) userData.cooldowns = {};
            
            const now = Date.now();

            // 2. VALIDASI HP & SENJATA
            if (userData.stats.hp <= 0) return context.reply({ embeds: [errorEmbed('☠️ Pingsan!', 'HP kamu 0! Gunakan `lunar!heal` terlebih dahulu.')] });
            if (!userData.gear || !userData.gear.weapon) return context.reply({ embeds: [warningEmbed('Tidak Ada Senjata!', 'Gunakan `lunar!equip <nama>` terlebih dahulu.')] });

            // 3. MODIFIER SCANNER (Buff dari Shop/Potion)
            let potongCooldown = 0, bonusRare = 0, extraDrop = 0;
            let bonusAtk = 0, bonusDef = 0;

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
                        if (sourceItem.modifier.atk_bonus) bonusAtk += sourceItem.modifier.atk_bonus;
                        if (sourceItem.modifier.def_bonus) bonusDef += sourceItem.modifier.def_bonus;
                    }
                }
            }

            // 4. COOLDOWN
            const baseCooldown = 2 * 60 * 1000;
            const cooldown = baseCooldown * (1 - (potongCooldown / 100));
            const lastHunt = userData.cooldowns.lastHunt || 0;

            if (now - lastHunt < cooldown) {
                const timeLeft = cooldown - (now - lastHunt);
                return context.reply({ embeds: [warningEmbed('Hutan Berbahaya', `Kamu butuh istirahat. Kembali dalam **${formatDuration(timeLeft)}**.`)] });
            }

            // 5. AREA & MONSTER
            const playerArea = userData.area || 1;
            const areaMonsters = huntDb[playerArea.toString()] || huntDb["1"];
            const monster = areaMonsters[Math.floor(Math.random() * areaMonsters.length)];

            // 6. PERHITUNGAN DAMAGE
            const playerAtk = userData.stats.attack + Math.floor(userData.stats.attack * (bonusAtk / 100));
            const playerDef = userData.stats.defense + Math.floor(userData.stats.defense * (bonusDef / 100));
            
            const monsterAtk = monster.atk * (Math.random() * 0.4 + 0.8);
            let damagePerHit = Math.max(5, monsterAtk - (playerDef * 0.8));
            let speedFactor = 100 / (playerAtk + 50);
            
            let damageReceived = Math.floor(damagePerHit * speedFactor);
            const minDamage = Math.max(1, Math.floor(playerArea * 2)); 
            damageReceived = Math.max(minDamage, damageReceived);

            // 7. EKSEKUSI HASIL
            userData.stats.hp -= damageReceived;
            userData.cooldowns.lastHunt = now;

            // JIKA KALAH
            if (userData.stats.hp <= 0) {
                userData.stats.hp = 0;
                const penalty = Math.floor(userData.koin * 0.05);
                userData.koin = Math.max(0, userData.koin - penalty);
                await userData.save();
                return context.reply({ embeds: [errorEmbed('☠️ Pertempuran Kalah!', `Kekuatanmu belum cukup! Kamu diserang telak oleh **${monster.nama}** dan menerima **-${damageReceived} HP**.\nKehilangan **${penalty}** Koin karena dijambret goblin saat pingsan.`)] });
            }

            // MENANG
            let dropId = monster.drops[0].id;
            let roll = Math.random() * 100;
            let currentChance = 0;
            
            for (const drop of monster.drops) {
                let chance = drop.chance;
                if (bonusRare > 0 && drop.id !== monster.drops[0].id) chance += bonusRare;
                currentChance += chance;
                if (roll <= currentChance) { dropId = drop.id; break; }
            }

            const dropItem = itemsDb[dropId] || itemsDb["batu_biasa"];
            const totalGet = 1 + extraDrop;
            
            for (let i = 0; i < totalGet; i++) {
                userData.inventory.push(dropItem.nama);
            }
            userData.koin = (userData.koin || 0) + monster.coin;
            
            // Simpan perubahan ke DB
            await userData.save();
            
            // 🟢 AWAIT: XP update
            const xpResult = await addXP(user.id, monster.xp);
            const hpBar = createProgressBar(userData.stats.hp, userData.stats.maxHp);
            
            const winEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle(`⚔️ Area ${playerArea} | vs ${monster.nama}`)
                .setDescription(`Pertarungan berhasil! Kamu menerima **-${damageReceived} HP**.`)
                .addFields(
                    { name: '🩸 Status Darah', value: `\`[${hpBar}]\` **${userData.stats.hp} / ${userData.stats.maxHp}**`, inline: false },
                    { name: '🎁 Hadiah', value: `> 📦 **Drop:** ${dropItem.nama}${totalGet > 1 ? ` (x${totalGet})` : ''}\n> 🪙 **Koin:** +${monster.coin}\n> ✨ **XP:** +${xpResult.currentXP}`, inline: false }
                )
                .setFooter({ text: xpResult.leveledUp ? '🎉 LEVEL UP! Status meningkat!' : 'Berburu selesai.' });

            return context.reply({ embeds: [winEmbed] });

        } catch (error) {
            console.error('[ERROR HUNT MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat berburu.')] });
        }
    }
};