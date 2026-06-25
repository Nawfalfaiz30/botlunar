const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, warningEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'poll',
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('📊 Membuat pemungutan suara (voting) sederhana.')
        .addStringOption(option => 
            option.setName('pertanyaan')
                .setDescription('Topik atau pertanyaan kuesioner')
                .setRequired(true)
        ),

    async executeSlash(interaction, client) {
        const question = interaction.options.getString('pertanyaan');
        await this.createPoll(interaction, question, true);
    },

    async executePrefix(message, args, client) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [warningEmbed('Format Salah', 'Masukkan topik voting!\nContoh: `!poll Apakah kita mabar malam ini?`')] });
        await this.createPoll(message, question, false);
    },

    async createPoll(context, question, isSlash) {
        const embed = baseEmbed(
            '📊 Pemungutan Suara (Voting)',
            `**Pertanyaan:**\n# ${question}\n\n🟩 = Setuju / Ya\n🟥 = Tidak Setuju / Tidak\n\n*Berikan reaksimu di bawah ini!*`,
            '#FEE75C'
        ).setAuthor({ name: `Dibuat oleh ${isSlash ? context.user.username : context.author.username}` });

        if (isSlash) {
            // Mengirim balasan awal, lalu menempelkan reaksi ke pesan kiriman tersebut
            const msg = await context.reply({ embeds: [embed], fetchReply: true });
            await msg.react('🟩');
            await msg.react('🟥');
        } else {
            const msg = await context.channel.send({ embeds: [embed] });
            await context.message.delete().catch(() => {}); // Hapus perintah ketik admin
            await msg.react('🟩');
            await msg.react('🟥');
        }
    }
};