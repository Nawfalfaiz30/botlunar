const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const { formatDuration } = require('../../helpers/utils.js');
const { addXP, addKoin } = require('../../helpers/economyHelper.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const dungeonDb = require('../../data/dungeon.json');
const shopDb = require('../../data/shop.json');

function createProgressBar(current, max, size = 10) {
    if (max <= 0) return '░'.repeat(size);
    const progress = Math.round((current / max) * size);
    const filled = progress > size ? size : progress;
    const empty = size - filled < 0 ? 0 : size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'dungeon',
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('🏰 Menantang Bos Area untuk membuka wilayah baru.'),

    async executeSlash(interaction) { await this.processDungeon(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processDungeon(message, message.author, false); },

    async processDungeon(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            // Inisialisasi object cooldowns jika belum ada
            if (!userData.cooldowns) userData.cooldowns = {};
            
            const now = Date.now();

            // 2. VALIDASI HP & COOLDOWN
            if (userData.stats.hp <= 0) {
                return context.reply({ embeds: [errorEmbed('☠️ Pingsan!', 'Kamu sedang pingsan! Gunakan `lunar!heal`.')] });
            }

            const cooldown = 6 * 60 * 60 * 1000; // 6 Jam
            const lastDungeon = userData.cooldowns.lastDungeon || 0;
            
            if (now - lastDungeon < cooldown) {
                return context.reply({ embeds: [warningEmbed('Gerbang Tertutup', `Dungeon masih terkunci. Kembali dalam **${formatDuration(cooldown - (now - lastDungeon))}**.`)] });
            }

            // 3. MODIFIER SCANNER (Buff Aktif dari shop.json)
            let bonusAtk = 0, bonusDef = 0, damageReduce = 0;
            
            // Membaca efek dari MongoDB
            const effects = userData.effects instanceof Map ? Object.fromEntries(userData.effects) : (userData.effects || {});

            for (const effectType in effects) {
                const effect = effects[effectType];
                if (effect.expiresAt > now) {
                    const sourceItem = Object.values(shopDb).find(i => i.type === effectType);
                    if (sourceItem?.modifier) {
                        if (sourceItem.modifier.atk_bonus) bonusAtk += sourceItem.modifier.atk_bonus;
                        if (sourceItem.modifier.def_bonus) bonusDef += sourceItem.modifier.def_bonus;
                        if (sourceItem.modifier.damage_reduce) damageReduce += sourceItem.modifier.damage_reduce;
                    }
                } else {
                    delete userData.effects[effectType];
                }
            }

            // 4. FETCH BOS DARI dungeon.json
            const currentArea = userData.area || 1;
            const bossData = dungeonDb[currentArea.toString()] || null;

            if (!bossData) {
                return context.reply({ embeds: [warningEmbed('Tamat', 'Selamat! Kamu telah mengalahkan semua Bos.')] });
            }

            // 5. KALKULASI PERTARUNGAN
            const pAtk = userData.stats.attack + (userData.stats.attack * bonusAtk / 100);
            const pDef = userData.stats.defense + (userData.stats.defense * bonusDef / 100);
            
            let playerDmgPerTurn = Math.max(5, Math.floor(pAtk - bossData.def));
            let bossDmgPerTurn = Math.max(3, Math.floor((bossData.atk - pDef) * (1 - damageReduce / 100)));

            const turnsToKillBoss = Math.ceil(bossData.hp / playerDmgPerTurn);
            const turnsToKillPlayer = Math.ceil(userData.stats.hp / bossDmgPerTurn);

            // 6. EKSEKUSI HASIL
            userData.cooldowns.lastDungeon = now;

            if (turnsToKillPlayer < turnsToKillBoss) {
                userData.stats.hp = 0; // Pingsan
                await userData.save();
                return context.reply({ embeds: [errorEmbed('☠️ PEMBANTAIAN', `Kamu menantang **${bossData.name}** tetapi kekuatanmu belum cukup! Kamu bertahan ${turnsToKillPlayer} giliran.`)] });
            }

            // Menang
            const damageTaken = (turnsToKillBoss - 1) * bossDmgPerTurn;
            userData.stats.hp = Math.max(0, userData.stats.hp - damageTaken);
            userData.area = currentArea + 1;
            userData.inventory.push(bossData.drop);
            
            await userData.save(); // Simpan perubahan area & inventory
            
            // 🟢 AWAIT: Helper functions (async)
            await addKoin(user.id, bossData.coin);
            const xpResult = await addXP(user.id, bossData.xp);

            const hpBar = createProgressBar(userData.stats.hp, userData.stats.maxHp);
            const winEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`🏆 BOS TERKALAHKAN! Area ${userData.area} Terbuka!`)
                .setDescription(`**${bossData.name}** tumbang dalam ${turnsToKillBoss} giliran.`)
                .addFields(
                    { name: '🎁 Hadiah', value: `🪙 +${bossData.coin} | ✨ +${bossData.xp} | 📦 ${bossData.drop}`, inline: false },
                    { name: '🩸 Sisa Darah', value: `\`[${hpBar}]\` **${userData.stats.hp} / ${userData.stats.maxHp}**`, inline: false }
                )
                .setFooter({ text: xpResult.leveledUp ? '🎉 LEVEL UP!' : 'Dungeon dibersihkan.' });

            return context.reply({ embeds: [winEmbed] });

        } catch (error) {
            console.error('[ERROR DUNGEON MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat memasuki dungeon.')] });
        }
    }
};