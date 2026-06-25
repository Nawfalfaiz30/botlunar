const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'userinfo',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 Menampilkan profil akun Discord pengguna.')
        .addUserOption(option => option.setName('target').setDescription('Pilih pengguna').setRequired(false)),

    async executeSlash(interaction, client) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        await this.showUserInfo(interaction, targetUser, targetMember, true);
    },

    async executePrefix(message, args, client) {
        const targetUser = message.mentions.users.first() || message.author;
        const targetMember = await message.guild.members.fetch(targetUser.id);
        await this.showUserInfo(message, targetUser, targetMember, false);
    },

    async showUserInfo(context, user, member, isSlash) {
        // Mengambil Role member dan mengabaikan role @everyone
        const roles = member.roles.cache.filter(r => r.id !== context.guild.id).map(r => r).join(', ') || 'Tidak ada role';

        const embed = baseEmbed(
            `👤 Profil Pengguna: ${user.username}`,
            `Berikut adalah data akun Discord milik <@${user.id}>.`,
            '#9b59b6'
        )
        .addFields(
            { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
            { name: '🤖 Status Bot', value: user.bot ? 'Ya' : 'Tidak', inline: true },
            { name: '📅 Daftar Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '📥 Masuk Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
            { name: `🛡️ Roles (${member.roles.cache.size - 1})`, value: roles, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));

        return isSlash ? await context.reply({ embeds: [embed] }) : await context.reply({ embeds: [embed] });
    }
};