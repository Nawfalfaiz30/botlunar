const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis
const areasDb = require('../../data/areas.json');

function createProgressBar(current, max, size = 10) {
    if (max <= 0) return '░'.repeat(size);
    const progress = Math.round((current / max) * size);
    const filled = progress > size ? size : progress;
    const empty = size - filled < 0 ? 0 : size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'profile',
    aliases: ['p'],
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('👤 Melihat profil statistik, gear, area, dan buff aktif.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih member untuk melihat profil mereka')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        await this.processProfile(interaction, targetUser, true);
    },

    async executePrefix(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        await this.processProfile(message, targetUser, false);
    },

    async processProfile(context, user, isSlash) {
        if (user.bot) {
            return context.reply({ content: '🤖 Bot tidak memiliki profil RPG.', ephemeral: true });
        }

        try {
            // 1. Ambil data dari MongoDB
            const userData = await User.findOne({ userId: user.id });
            
            // Jika user belum pernah main sama sekali
            if (!userData) {
                const warn = warningEmbed('Belum Terdaftar', 'User tersebut belum terdaftar dalam sistem RPG.');
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 2. Data Dasar & Statistik
            const stats = userData.stats || { hp: 100, maxHp: 100, attack: 10, defense: 5 };
            const xpDibutuhkan = (userData.level || 1) * 100;
            
            const areaNum = userData.area || 1;
            const areaName = areasDb[areaNum.toString()] || "Desa Pemula";
            const hpBar = createProgressBar(stats.hp, stats.maxHp);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle(`👤 Profil RPG: ${user.username}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Lunar RPG System | ID: ${user.id}` });

            // Statistik Dasar
            embed.addFields(
                { name: '⭐ Level', value: `\`${userData.level || 1}\``, inline: true },
                { name: '✨ XP', value: `\`${userData.xp || 0} / ${xpDibutuhkan}\``, inline: true },
                { name: '💰 Saldo', value: `🪙 **${userData.koin || 0}**`, inline: true },
                { name: '🩸 HP', value: `\`[${hpBar}]\` **${stats.hp}/${stats.maxHp}**`, inline: false },
                { name: '⚔️ Attack', value: `**${stats.attack}**`, inline: true },
                { name: '🛡️ Defense', value: `**${stats.defense}**`, inline: true },
                { name: '🗺️ Lokasi Saat Ini', value: `**Area ${areaNum}**\n${areaName}`, inline: true }
            );

            // 3. PERLENGKAPAN (Gear)
            const gear = userData.gear || {};
            embed.addFields({
                name: '🛡️ Perlengkapan (Equipped)',
                value: `⚔️ **Senjata:** ${gear.weapon || '*Kosong*'}\n🛡️ **Armor:** ${gear.armor || '*Kosong*'}\n🎣 **Pancingan:** ${gear.pancing || '*Kosong*'}\n⛏️ **Pickaxe:** ${gear.pickaxe || '*Kosong*'}\n🪓 **Kapak:** ${gear.kapak || '*Kosong*'}`,
                inline: false
            });

            // 4. Buff Aktif
            const now = Date.now();
            let effectsText = '';
            
            // Konversi Map/Object dari MongoDB
            const effectsData = userData.effects instanceof Map ? Object.fromEntries(userData.effects) : (userData.effects || {});

            for (const [effectType, effectInfo] of Object.entries(effectsData)) {
                if (effectInfo.expiresAt > now) {
                    const timeStr = `<t:${Math.floor(effectInfo.expiresAt / 1000)}:R>`;
                    const effectName = effectType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    effectsText += `✨ **${effectName}** (Selesai ${timeStr})\n`;
                }
            }
            
            embed.addFields({ 
                name: '⚡ Status / Buff Aktif', 
                value: effectsText || '*Tidak ada buff yang aktif.*', 
                inline: false 
            });

            return context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR PROFILE MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan saat memuat profil.', ephemeral: true });
        }
    }
};