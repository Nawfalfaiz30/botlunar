const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, successEmbed, errorEmbed } = require('../../helpers/embed.js');
const { formatDuration } = require('../../helpers/utils.js');
const { addXP } = require('../../helpers/economyHelper.js');
const User = require('../../models/userSchema.js');

// Data statis
const chopDb = require('../../data/chop.json');
const shopDb = require('../../data/shop.json');
const itemsDb = require('../../data/items.json');

const allItems = { ...itemsDb, ...shopDb };

module.exports = {
    name: 'chop',
    data: new SlashCommandBuilder()
        .setName('chop')
        .setDescription('🪓 Menebang pohon untuk mendapatkan material kayu.'),

    async executeSlash(interaction) {
        await this.processChop(interaction, interaction.user, true);
    },

    async executePrefix(message) {
        await this.processChop(message, message.author, false);
    },

    normalize(text) {
        return text
            .toLowerCase()
            .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
            .replace(/[^a-z0-9\s]/gi, '')
            .trim();
    },

    async processChop(context, user, isSlash) {
        try {
            // 1. Ambil Data User
            let userData = await User.findOne({ userId: user.id });

            if (!userData) {
                return context.reply({
                    embeds: [
                        warningEmbed(
                            'Error',
                            'Profil belum terdaftar. Silakan chat apapun untuk mendaftar.'
                        )
                    ]
                });
            }

            if (!userData.cooldowns) {
                userData.cooldowns = {};
            }

            const now = Date.now();

            // 2. CEK KAPAK YANG DIPAKAI
            if (!userData.gear || !userData.gear.kapak) {
                return context.reply({
                    embeds: [
                        warningEmbed(
                            'Tidak Ada Kapak',
                            'Kamu harus memakai (equip) **Kapak** terlebih dahulu! Gunakan `lunar!equip <nama kapak>`.'
                        )
                    ]
                });
            }

            const equippedAxe = userData.gear.kapak;

            const axeData = Object.values(allItems).find(
                i => this.normalize(i.nama) === this.normalize(equippedAxe)
            );

            // 3. MODIFIER
            let potongCooldown = 0;
            let bonusRare = 0;
            let extraDrop = 0;

            if (axeData?.modifier) {
                if (axeData.modifier.cooldown_cut)
                    potongCooldown += axeData.modifier.cooldown_cut;

                if (axeData.modifier.rare_chance)
                    bonusRare += axeData.modifier.rare_chance;

                if (axeData.modifier.extra_drop)
                    extraDrop += axeData.modifier.extra_drop;
            }

            // Efek aktif
            const effects =
                userData.effects instanceof Map
                    ? Object.fromEntries(userData.effects)
                    : (userData.effects || {});

            for (const effectType in effects) {
                const effect = effects[effectType];

                if (effect.expiresAt < now) {
                    delete userData.effects[effectType];
                    continue;
                }

                const sourceItem = Object.values(shopDb).find(
                    i => i.type === effectType
                );

                if (sourceItem?.modifier) {
                    if (sourceItem.modifier.cooldown_cut)
                        potongCooldown += sourceItem.modifier.cooldown_cut;

                    if (sourceItem.modifier.rare_chance)
                        bonusRare += sourceItem.modifier.rare_chance;

                    if (sourceItem.modifier.extra_drop)
                        extraDrop += sourceItem.modifier.extra_drop;
                }
            }

            // 4. COOLDOWN
            const baseCooldown = 4 * 60 * 1000; // 4 menit

            const cooldown =
                baseCooldown * (1 - (potongCooldown / 100));

            const lastChop =
                userData.cooldowns.lastChop || 0;

            if (now - lastChop < cooldown) {
                const timeLeft =
                    cooldown - (now - lastChop);

                return context.reply({
                    embeds: [
                        warningEmbed(
                            'Tangan Pegal',
                            `Istirahat dulu! Tunggu **${formatDuration(timeLeft)}**.`
                        )
                    ]
                });
            }

            // 5. AREA & DROP
            const playerArea = userData.area || 1;

            const areaChops =
                chopDb[playerArea.toString()] ||
                chopDb['1'];

            const tree =
                areaChops[
                    Math.floor(Math.random() * areaChops.length)
                ];

            let dropId = tree.drops[0].id;

            let roll = Math.random() * 100;
            let currentChance = 0;

            for (const drop of tree.drops) {
                let chance = drop.chance;

                if (
                    bonusRare > 0 &&
                    drop.id !== tree.drops[0].id
                ) {
                    chance += bonusRare;
                }

                currentChance += chance;

                if (roll <= currentChance) {
                    dropId = drop.id;
                    break;
                }
            }

            const dropItem =
                itemsDb[dropId] ||
                itemsDb['kayu_biasa'];

            // 6. SIMPAN DATA
            userData.cooldowns.lastChop = now;

            const totalGet = 1 + extraDrop;

            for (let i = 0; i < totalGet; i++) {
                userData.inventory.push(
                    `${dropItem.ikon || ''} ${dropItem.nama}`
                );
            }

            await userData.save();

            await addXP(user.id, 12);

            const toolMsg =
                `*(Menggunakan ${equippedAxe})*`;

            const resultEmbed = successEmbed(
                `🪓 Area ${playerArea} | Penebangan`,
                `Kamu menebang **${tree.nama}** dan mendapatkan:\n\n` +
                `**${dropItem.ikon || '📦'} ${dropItem.nama}** ` +
                `${totalGet > 1 ? `(x${totalGet})` : ''}\n` +
                `*${dropItem.deskripsi || ''}*\n\n` +
                `${toolMsg}`
            );

            return context.reply({
                embeds: [resultEmbed]
            });

        } catch (error) {
            console.error('[ERROR CHOP MONGODB]', error);

            return context.reply({
                embeds: [
                    errorEmbed(
                        'Gagal',
                        'Terjadi kesalahan sistem saat menebang pohon.'
                    )
                ]
            });
        }
    }
};

