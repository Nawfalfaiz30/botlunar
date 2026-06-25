const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'valorant',
    data: new SlashCommandBuilder()
        .setName('valorant')
        .setDescription('🎮 Melihat profil akun pemain Valorant.')
        .addStringOption(option => 
            option.setName('riot_id')
                .setDescription('Nama In-Game (Contoh: TenZ)')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('tagline')
                .setDescription('Tagline tanpa tanda # (Contoh: 0505)')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        await interaction.deferReply();
        const riotId = interaction.options.getString('riot_id');
        const tagline = interaction.options.getString('tagline');
        await this.processValorant(interaction, riotId, tagline, true);
    },

    async executePrefix(message, args, client) {
        // Format: lunar!valorant TenZ 0505
        const riotId = args[0];
        const tagline = args[1];

        if (!riotId || !tagline) {
            const warn = warningEmbed(
                'Format Salah', 
                'Kamu harus memasukkan Riot ID dan Tagline!\nContoh: `lunar!valorant TenZ 0505`'
            );
            return message.reply({ embeds: [warn] });
        }

        const waitMsg = await message.reply('⏳ *Menghubungi server Riot Games...*');
        await this.processValorant(message, riotId, tagline, false, waitMsg);
    },

    async processValorant(context, riotId, tagline, isSlash, waitMsg = null) {
        try {
            // Memanggil API Publik HenrikDev untuk Valorant
            const url = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(riotId)}/${encodeURIComponent(tagline)}`;
            const response = await fetch(url);
            const data = await response.json();

            // Jika akun tidak ditemukan atau API error
            if (data.status !== 200 || !data.data) {
                const errEmbed = errorEmbed(
                    'Pemain Tidak Ditemukan', 
                    `Akun **${riotId}#${tagline}** tidak ditemukan. Pastikan nama dan tagline sudah benar!`
                );
                return isSlash ? await context.editReply({ embeds: [errEmbed] }) : await waitMsg.edit({ content: null, embeds: [errEmbed] });
            }

            const playerData = data.data;

            // Membuat embed visual untuk profil pemain
            const valoEmbed = baseEmbed(
                `🎮 Profil Valorant: ${playerData.name}#${playerData.tag}`,
                `Berikut adalah data akun dari server resmi Riot Games.`,
                '#FA4454' // Warna merah khas Valorant
            )
            .addFields(
                { name: '🌍 Region', value: `\`${playerData.region.toUpperCase()}\``, inline: true },
                { name: '⭐ Level Akun', value: `\`${playerData.account_level}\``, inline: true }
            )
            .setThumbnail(playerData.card.small) // Menampilkan Player Card bagian kecil
            .setImage(playerData.card.wide); // Menampilkan Banner Player Card secara lebar

            return isSlash ? await context.editReply({ embeds: [valoEmbed] }) : await waitMsg.edit({ content: null, embeds: [valoEmbed] });

        } catch (error) {
            console.error('[ERROR VALORANT API]', error);
            const errReply = errorEmbed('Gangguan Server', 'Tidak dapat menghubungi API Valorant saat ini. Coba lagi nanti.');
            return isSlash ? await context.editReply({ embeds: [errReply] }) : await waitMsg.edit({ content: null, embeds: [errReply] });
        }
    }
};