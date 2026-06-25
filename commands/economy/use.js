const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal
const itemsDb = require('../../data/items.json');
const shopDb = require('../../data/shop.json');
const allItems = { ...itemsDb, ...shopDb };

function createProgressBar(current, max, size = 10) {
    if (max <= 0) return '░'.repeat(size);
    const progress = Math.round((current / max) * size);
    const filled = progress > size ? size : progress;
    const empty = size - filled < 0 ? 0 : size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'use',
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('🎒 Gunakan item dari inventory (Potion, Ramuan, Buff).')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Nama barang yang ingin digunakan')
                .setRequired(true)
        ),

    async executeSlash(interaction) {
        const item = interaction.options.getString('item');
        await this.run(interaction, interaction.user, item, true);
    },

    async executePrefix(message, args) {
        if (!args.length) {
            return message.reply({ embeds: [warningEmbed('Format Salah', 'Sebutkan item yang ingin dipakai!\nContoh: `lunar!use Potion HP Kecil`')] });
        }
        const item = args.join(' ');
        await this.run(message, message.author, item, false);
    },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
    },

    async run(context, user, input, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            const userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });
            
            const inv = userData.inventory || [];
            const search = this.normalize(input);

            // 2. CEK KEBERADAAN ITEM DI TAS
            let index = -1;
            let foundItemName = null;

            for (let i = 0; i < inv.length; i++) {
                const itemName = inv[i];
                if (this.normalize(itemName).includes(search)) {
                    index = i;
                    foundItemName = itemName;
                    break;
                }
            }

            if (index === -1) {
                const err = errorEmbed('Item Tidak Ditemukan', `Kamu tidak memiliki barang yang mengandung kata **"${input}"** di dalam tasmu.`);
                return isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] });
            }

            // 3. VALIDASI TIPE BARANG
            let itemData = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(foundItemName));
            if (!itemData || (!itemData.usable && itemData.type !== 'consumable')) {
                const warn = warningEmbed('Tidak Bisa Digunakan', `**${foundItemName}** bukan merupakan barang yang bisa dikonsumsi atau digunakan langsung.`);
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 4A. LOGIKA HEALING
            if (itemData.type === 'consumable' && itemData.heal) {
                if (userData.stats.hp >= userData.stats.maxHp) {
                    return context.reply({ embeds: [warningEmbed('Masih Kenyang', 'Darah (HP) kamu sudah penuh! Jangan buang-buang Potion atau Makanan.')] });
                }

                // Update Data
                userData.inventory.splice(index, 1);
                userData.stats.hp = Math.min(userData.stats.maxHp, userData.stats.hp + itemData.heal);
                await userData.save();

                const hpBar = createProgressBar(userData.stats.hp, userData.stats.maxHp);
                const healEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ name: '🧪 Potion Digunakan' })
                    .setDescription(`Kamu menggunakan **${foundItemName}**.\n*${itemData.deskripsi || itemData.msg}*`)
                    .addFields(
                        { name: 'Pemulihan', value: `\`+${itemData.heal} HP\``, inline: true },
                        { name: 'Status Darah', value: `\`[${hpBar}]\`\n**${userData.stats.hp} / ${userData.stats.maxHp}**`, inline: true }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }));

                return context.reply({ embeds: [healEmbed] });
            }

            // 4B. LOGIKA BUFF / DURASI
            if (itemData.duration && itemData.duration > 0) {
                const now = Date.now();
                if (!userData.effects) userData.effects = {};

                userData.effects[itemData.type] = {
                    active: true,
                    expiresAt: now + itemData.duration
                };

                userData.inventory.splice(index, 1);
                await userData.save();

                const durationMinutes = Math.floor(itemData.duration / 60000);
                const buffMsg = itemData.msg || itemData.deskripsi || `Efek ${itemData.nama} berhasil diaktifkan.`;

                const buffEmbed = successEmbed(
                    '✨ Item Buff Digunakan',
                    `Kamu meminum **${foundItemName}**\n\n💬 **Efek:** ${buffMsg}\n⏱️ **Durasi Aktif:** ${durationMinutes >= 60 ? `${durationMinutes/60} Jam` : `${durationMinutes} Menit`}`
                );

                return context.reply({ embeds: [buffEmbed] });
            }

            return context.reply({ embeds: [warningEmbed('Gagal', 'Item ini belum memiliki efek yang dikonfigurasi dengan benar di sistem.')] });

        } catch (error) {
            console.error('[ERROR USE MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat mencoba menggunakan item.')] });
        }
    }
};