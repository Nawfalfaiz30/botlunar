const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readJSON, formatDuration } = require('../../helpers/utils.js');
const { warningEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'cd',
    data: new SlashCommandBuilder()
        .setName('cd')
        .setDescription('⏳ Mengecek sisa waktu cooldown untuk semua aktivitasmu.'),

    async executeSlash(interaction) { await this.processCooldowns(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processCooldowns(message, message.author, false); },

    async processCooldowns(context, user, isSlash) {
        try {
            // 1. Ambil Data (Dinamis dari Mongo, Statis dari JSON)
            const userData = await User.findOne({ userId: user.id });
            const shopDb = readJSON('shop.json') || {}; 
            const now = Date.now();

            // Jika user belum pernah main sama sekali
            if (!userData) {
                const warnEmbed = warningEmbed('Belum Terdaftar', 'Kamu belum memiliki data. Gunakan perintah apa saja terlebih dahulu.');
                return isSlash 
                    ? context.reply({ embeds: [warnEmbed], ephemeral: true }) 
                    : context.reply({ embeds: [warnEmbed] });
            }

            // 2. MODIFIER SCANNER (Buff dari shop.json)
            let potongCooldown = 0;
            
            // Konversi dari format Mongoose jika berbentuk Map/Dict
            const effects = userData.effects instanceof Map 
                ? Object.fromEntries(userData.effects) 
                : (userData.effects || {});

            for (const effectType in effects) {
                const effect = effects[effectType];
                if (effect.expiresAt > now) {
                    // Mencari buff di shop.json
                    const source = Object.values(shopDb).find(i => i.type === effectType);
                    if (source?.modifier?.cooldown_cut) {
                        potongCooldown += source.modifier.cooldown_cut;
                    }
                }
            }

            // 3. BASE COOLDOWN (Durasi dasar)
            const baseTimes = {
                mine: 5 * 60 * 1000,
                chop: 4 * 60 * 1000,
                fish: 3 * 60 * 1000,
                hunt: 2 * 60 * 1000,
                dungeon: 6 * 60 * 60 * 1000, // 6 Jam
                work: 60 * 60 * 1000,
                rob: 60 * 60 * 1000,
                daily: 24 * 60 * 60 * 1000
            };

            // 4. FUNGSI HITUNG SISA WAKTU
            const getLeft = (lastTime, baseCd) => {
                const activeCd = baseCd * (1 - potongCooldown / 100);
                if (!lastTime || lastTime === 0) return '✅ **Ready!**';
                const timeLeft = activeCd - (now - lastTime);
                if (timeLeft <= 0) return '✅ **Ready!**';
                return `⏳ \`${formatDuration(timeLeft)}\``;
            };

            // Menentukan letak cooldowns (mendukung format schema baru dan data lama json)
            const cds = userData.cooldowns || userData;

            // 5. GENERATE DATA
            const cdMine = getLeft(cds.lastMine, baseTimes.mine);
            const cdChop = getLeft(cds.lastChop, baseTimes.chop);
            const cdFish = getLeft(cds.lastFish, baseTimes.fish);
            const cdHunt = getLeft(cds.lastHunt, baseTimes.hunt);
            const cdDungeon = getLeft(cds.lastDungeon, baseTimes.dungeon);
            const cdWork = getLeft(cds.lastWork, baseTimes.work);
            const cdRob = getLeft(cds.lastRob, baseTimes.rob);
            const cdDaily = getLeft(cds.lastDaily, baseTimes.daily);

            const embed = new EmbedBuilder()
                .setColor(potongCooldown > 0 ? '#3498DB' : '#2B2D31')
                .setAuthor({ name: `⏳ Cooldowns | ${user.username}`, iconURL: user.displayAvatarURL() })
                .setDescription(potongCooldown > 0 ? `✨ *Buff Cooldown Reduction aktif: **${potongCooldown}%***` : 'Berikut adalah status aktivitasmu:')
                .addFields(
                    { name: '🛠️ Gathering', value: `> ⛏️ **Mine:** ${cdMine}\n> 🪓 **Chop:** ${cdChop}\n> 🎣 **Fish:** ${cdFish}`, inline: false },
                    { name: '⚔️ Combat', value: `> 🏹 **Hunt:** ${cdHunt}\n> 🏰 **Dungeon:** ${cdDungeon}`, inline: false },
                    { name: '💰 Economy', value: `> 💼 **Work:** ${cdWork}\n> 🥷 **Rob:** ${cdRob}\n> 🎁 **Daily:** ${cdDaily}`, inline: false }
                )
                .setFooter({ text: 'Waktu sudah disesuaikan dengan buff aktif.' });

            return context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR COOLDOWN COMMAND]', error);
            return context.reply({ content: '❌ Gagal memuat data cooldown.', ephemeral: true });
        }
    }
};