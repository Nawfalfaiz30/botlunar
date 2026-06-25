const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../helpers/embed.js');
const Guild = require('../../models/guildSchema.js'); // 🟢 UBAH: Import model Guild, bukan Security

module.exports = {
    name: 'automod',
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('🛡️ [ADMIN] Mengatur AutoMod custom kata kasar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Tambah kata terlarang')
                .addStringOption(opt => opt.setName('kata').setDescription('Kata yang dilarang').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Hapus kata terlarang')
                .addStringOption(opt => opt.setName('kata').setDescription('Kata yang akan dihapus').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Lihat daftar kata terlarang')
        ),

    // ====================== HELPER DB (ASYNC) ======================
    // 🟢 UBAH: Tambahkan parameter guildId
    async getBadWords(guildId) {
        let config = await Guild.findOne({ guildId: guildId });
        return config?.badWords || [];
    },

    // 🟢 UBAH: Tambahkan parameter guildId
    async updateBadWords(guildId, words) {
        await Guild.findOneAndUpdate(
            { guildId: guildId },
            { $set: { badWords: [...new Set(words.map(w => w.toLowerCase().trim()))] } },
            { upsert: true }
        );
    },

    // ====================== SLASH ======================
    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [errorEmbed('❌ Akses Ditolak', 'Hanya Administrator yang boleh menggunakan command ini.')],
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            const sub = interaction.options.getSubcommand();
            if (sub === 'add') await this.addBadWord(interaction);
            else if (sub === 'remove') await this.removeBadWord(interaction);
            else if (sub === 'list') await this.listBadWords(interaction, true);
        } catch (error) {
            console.error('[ERROR AUTOMOD SLASH]', error);
            await interaction.reply({ content: '❌ Terjadi kesalahan sistem.', flags: [MessageFlags.Ephemeral] });
        }
    },

    // ====================== PREFIX ======================
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const sub = args[0]?.toLowerCase();
        const query = args.slice(1).join(' ');

        if (sub === 'add' && query) await this.addBadWordPrefix(message, query);
        else if (sub === 'remove' && query) await this.removeBadWordPrefix(message, query);
        else if (sub === 'list') await this.listBadWords(message, false);
        else message.reply({ embeds: [warningEmbed('Format Salah', 'Gunakan: `lunar!automod add <kata>` | `lunar!automod remove <kata>` | `lunar!automod list`')] });
    },

    // ====================== LOGIKA ======================
    async addBadWord(interaction) {
        const word = interaction.options.getString('kata').toLowerCase().trim();
        const guildId = interaction.guild.id; // 🟢 Ambil ID Server
        let words = await this.getBadWords(guildId);
        
        if (words.includes(word)) {
            return interaction.reply({ content: `✅ \`${word}\` sudah ada dalam daftar.`, flags: [MessageFlags.Ephemeral] });
        }
        words.push(word);
        await this.updateBadWords(guildId, words);
        await interaction.reply({ embeds: [successEmbed('✅ Kata Ditambahkan', `Kata \`${word}\` berhasil disimpan ke filter server ini.`)] });
    },

    async addBadWordPrefix(message, wordInput) {
        const word = wordInput.toLowerCase().trim();
        const guildId = message.guild.id; // 🟢 Ambil ID Server
        let words = await this.getBadWords(guildId);

        if (words.includes(word)) return message.reply({ content: `✅ \`${word}\` sudah ada dalam daftar.` });
        words.push(word);
        await this.updateBadWords(guildId, words);
        message.reply({ embeds: [successEmbed('✅ Kata Ditambahkan', `Kata \`${word}\` berhasil disimpan ke filter server ini.`)] });
    },

    async removeBadWord(interaction) {
        const word = interaction.options.getString('kata').toLowerCase().trim();
        const guildId = interaction.guild.id;
        let words = await this.getBadWords(guildId);
        
        if (!words.includes(word)) {
            return interaction.reply({ content: `⚠️ \`${word}\` tidak ditemukan dalam daftar.`, flags: [MessageFlags.Ephemeral] });
        }
        words = words.filter(w => w !== word);
        await this.updateBadWords(guildId, words);
        await interaction.reply({ embeds: [successEmbed('✅ Kata Dihapus', `Kata \`${word}\` berhasil dihapus dari filter.`)] });
    },

    async removeBadWordPrefix(message, wordInput) {
        const word = wordInput.toLowerCase().trim();
        const guildId = message.guild.id;
        let words = await this.getBadWords(guildId);

        if (!words.includes(word)) return message.reply({ content: `⚠️ \`${word}\` tidak ditemukan dalam daftar.` });
        words = words.filter(w => w !== word);
        await this.updateBadWords(guildId, words);
        message.reply({ embeds: [successEmbed('✅ Kata Dihapus', `Kata \`${word}\` berhasil dihapus dari filter.`)] });
    },

    async listBadWords(context, isSlash) {
        const guildId = context.guild.id;
        const words = await this.getBadWords(guildId);
        const embed = successEmbed(
            '📋 Daftar Kata Terlarang Server Ini',
            words.length ? words.map((w, i) => `**${i + 1}.** \`${w}\``).join('\n') : 'Belum ada kata yang ditambahkan.'
        );
        return context.reply({ embeds: [embed] });
    }
};