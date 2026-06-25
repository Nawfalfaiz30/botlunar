const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warningEmbed, errorEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis tetap menggunakan JSON lokal agar cepat
const itemsDb = require('../../data/items.json');

function createProgressBar(current, max, size = 10) {
    if (max <= 0) return '░'.repeat(size);
    const progress = Math.round((current / max) * size);
    const filled = progress > size ? size : progress;
    const empty = size - filled < 0 ? 0 : size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'heal',
    aliases: ['eat', 'consume'],
    data: new SlashCommandBuilder()
        .setName('heal')
        .setDescription('🍎 Mengonsumsi makanan atau ramuan untuk memulihkan Darah (HP).')
        .addStringOption(option => 
            option.setName('barang')
                .setDescription('Nama barang yang ingin dimakan (contoh: Daging Biasa)')
                .setRequired(true)
        ),

    async executeSlash(interaction) {
        await this.processHeal(interaction, interaction.user, interaction.options.getString('barang'), true);
    },

    async executePrefix(message, args) {
        if (!args || args.length === 0) {
            const warn = warningEmbed('Format Salah', 'Sebutkan barang yang ingin kamu makan!\nContoh: `lunar!heal Daging Biasa`');
            return message.reply({ embeds: [warn] });
        }
        const itemName = args.join(' ');
        await this.processHeal(message, message.author, itemName, false);
    },

    normalize(text) {
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    },

    async processHeal(context, user, queryName, isSlash) {
        try {
            // 1. Ambil data dari MongoDB
            const userData = await User.findOne({ userId: user.id });
            if (!userData) return context.reply({ embeds: [warningEmbed('Error', 'Profil belum terdaftar.')] });

            if (userData.stats.hp >= userData.stats.maxHp) {
                const warn = warningEmbed('Masih Kenyang', 'Darah (HP) kamu sudah penuh! Jangan buang-buang makanan.');
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 2. Pengecekan Inventory
            const inventory = userData.inventory || [];
            const cleanQuery = this.normalize(queryName);
            const itemIndex = inventory.findIndex(item => this.normalize(item).includes(cleanQuery));

            if (itemIndex === -1) {
                const err = errorEmbed('Barang Tidak Ditemukan', `Kamu tidak memiliki **${queryName}** di dalam tasmu.`);
                return isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] });
            }

            const realItemName = inventory[itemIndex];

            // 3. Validasi Tipe Barang
            const itemDetails = Object.values(itemsDb).find(i => this.normalize(i.nama) === this.normalize(realItemName));

            if (!itemDetails || itemDetails.type !== 'consumable' || !itemDetails.heal) {
                const warn = warningEmbed('Tidak Bisa Dimakan', `Kamu tidak bisa memakan/menggunakan **${realItemName}** untuk memulihkan HP!`);
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 4. Proses Konsumsi
            userData.inventory.splice(itemIndex, 1);
            
            // Update HP langsung di objek MongoDB
            const healAmount = itemDetails.heal;
            userData.stats.hp = Math.min(userData.stats.maxHp, userData.stats.hp + healAmount);
            
            // Simpan perubahan ke database
            await userData.save();

            // 5. Tampilkan Hasil
            const hpBar = createProgressBar(userData.stats.hp, userData.stats.maxHp);
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setAuthor({ name: '🍎 Makan & Pemulihan' })
                .setDescription(`Kamu memakan/menggunakan **${realItemName}**.\n*${itemDetails.deskripsi}*`)
                .addFields(
                    { name: 'Pemulihan', value: `\`+${healAmount} HP\``, inline: true },
                    { name: 'Darah (HP) Saat Ini', value: `\`[${hpBar}]\`\n**${userData.stats.hp} / ${userData.stats.maxHp}**`, inline: true }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Tetap jaga HP kamu agar bisa terus bertarung!' });

            return context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR HEAL MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat mencoba memulihkan HP.')] });
        }
    }
};