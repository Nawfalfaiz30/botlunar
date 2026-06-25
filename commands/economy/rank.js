const { SlashCommandBuilder } = require('discord.js');
const { thumbnailEmbed } = require('../../helpers/embed.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

module.exports = {
    name: 'rank',
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('🏆 Melihat peringkat level dan XP kamu di server.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih member untuk melihat peringkat mereka')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        await this.processRank(interaction, targetUser, true);
    },

    async executePrefix(message) {
        const targetUser = message.mentions.users.first() || message.author;
        await this.processRank(message, targetUser, false);
    },

    async processRank(context, user, isSlash) {
        if (user.bot) {
            return context.reply({ content: '🤖 Bot tidak ikut serta dalam sistem peringkat server.', ephemeral: true });
        }

        try {
            // 1. Ambil data User dari MongoDB
            const userData = await User.findOne({ userId: user.id });

            if (!userData) {
                return context.reply({ 
                    content: `❌ **${user.username}** belum memiliki data XP. Kirim beberapa pesan terlebih dahulu!`, 
                    ephemeral: true 
                });
            }

            // 2. Kalkulasi Peringkat (Metode Efisien MongoDB)
            // Menghitung berapa orang yang levelnya lebih tinggi, 
            // ATAU level sama tapi XP lebih tinggi.
            const rank = await User.countDocuments({
                $or: [
                    { level: { $gt: userData.level } },
                    { level: userData.level, xp: { $gt: userData.xp } }
                ]
            }) + 1;

            // 3. Total member untuk perbandingan
            const totalMembers = await User.countDocuments({});

            const xpDibutuhkan = userData.level * 100;

            // 4. Membuat visual kartu peringkat
            const embed = thumbnailEmbed(
                `🏆 Peringkat: ${user.username}`,
                `Saat ini berada di **Peringkat #${rank}** dari **${totalMembers}** member yang terdaftar di sistem.`,
                user.displayAvatarURL({ dynamic: true, size: 512 })
            );

            embed.addFields(
                { name: '⭐ Level', value: `\`${userData.level || 1}\``, inline: true },
                { name: '✨ Progress XP', value: `\`${userData.xp || 0} / ${xpDibutuhkan} XP\``, inline: true }
            );

            return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[ERROR RANK MONGODB]', error);
            return context.reply({ content: '❌ Terjadi kesalahan saat memuat peringkat.', ephemeral: true });
        }
    }
};