const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'giveaway',
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('🎉 [ADMIN] Memulai giveaway di channel ini.')
        .addStringOption(option => option.setName('hadiah').setDescription('Nama hadiah yang diberikan').setRequired(true))
        .addIntegerOption(option => option.setName('menit').setDescription('Durasi giveaway dalam hitungan menit').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Akses ditolak.', ephemeral: true });
        
        const hadiah = interaction.options.getString('hadiah');
        const menit = interaction.options.getInteger('menit');
        await this.runGiveaway(interaction, hadiah, menit, true);
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Akses ditolak.');

        const menit = parseInt(args[0]);
        const hadiah = args.slice(1).join(' ');

        if (isNaN(menit) || !hadiah) {
            return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan format: `!giveaway [durasi_menit] [hadiah]`\nContoh: `!giveaway 60 Discord Nitro`')] });
        }
        await this.runGiveaway(message, hadiah, menit, false);
    },

    async runGiveaway(context, hadiah, menit, isSlash) {
        if (isSlash) await context.reply({ content: 'Mempersiapkan giveaway...', ephemeral: true });

        // Menghitung Timestamp Discord untuk waktu selesai
        const endTime = Date.now() + (menit * 60 * 1000);
        const gwEmbed = baseEmbed(
            '🎉 GIVEAWAY DIMULAI! 🎉',
            `**Hadiah:** ${hadiah}\n**Berakhir:** <t:${Math.floor(endTime / 1000)}:R>\n\nTekan reaksi 🎉 di bawah untuk ikut serta!`,
            '#EB459E' // Pink
        );

        const gwMsg = await context.channel.send({ embeds: [gwEmbed] });
        await gwMsg.react('🎉');

        // Menunggu waktu habis
        setTimeout(async () => {
            try {
                // Ambil ulang data pesan untuk mendapatkan jumlah reaksi yang masuk
                const fetchedMsg = await context.channel.messages.fetch(gwMsg.id);
                const reaction = fetchedMsg.reactions.cache.get('🎉');
                
                // Ambil daftar user dan saring agar bot tidak dihitung
                const users = await reaction.users.fetch();
                const validUsers = users.filter(u => !u.bot);

                if (validUsers.size === 0) {
                    const failEmbed = errorEmbed('Giveaway Dibatalkan', `Tidak ada yang mengikuti giveaway **${hadiah}**.`);
                    return context.channel.send({ embeds: [failEmbed] });
                }

                // Pilih pemenang secara acak
                const winner = validUsers.random();
                const winEmbed = successEmbed('🎉 GIVEAWAY BERAKHIR 🎉', `Pemenang hadiah **${hadiah}** adalah <@${winner.id}>!\nSelamat! Silakan hubungi admin untuk klaim hadiahmu.`);
                
                await context.channel.send({ content: `Selamat kepada <@${winner.id}>!`, embeds: [winEmbed] });
            } catch (error) {
                console.error('[ERROR GIVEAWAY]', error);
            }
        }, menit * 60 * 1000);
    }
};