const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField, MessageFlags } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../../helpers/embed.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

module.exports = {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Menampilkan semua perintah bot Lunar atau info detail perintah tertentu.')
        .addStringOption(option => 
            option.setName('perintah')
                .setDescription('Ketik nama perintah spesifik untuk melihat cara menggunakannya.')
                .setRequired(false)
        ),

    async executeSlash(interaction, client) {
        const commandName = interaction.options.getString('perintah');
        await this.generateHelp(interaction, commandName, client, true);
    },

    async executePrefix(message, args, client) {
        const commandName = args[0];
        await this.generateHelp(message, commandName, client, false);
    },

    async generateHelp(context, commandName, client, isSlash) {
        const prefix = process.env.PREFIX || 'lunar!';
        const userId = isSlash ? context.user.id : context.author.id;

        // ==================================================
        // SKENARIO 1: MENAMPILKAN MENU HELP (KATEGORI)
        // ==================================================
        if (!commandName) {
            // Kita pisahkan folder mana yang khusus admin dan mana yang publik
            const adminFolders = ['admin', 'security']; // Tambahkan nama folder rahasia di sini
            
            const memberEmbed = baseEmbed(
                '📚 Panduan Perintah Bot Lunar',
                `Gunakan \`${prefix}help [nama_perintah]\` atau \`/help [nama_perintah]\` untuk melihat detail spesifik!\n\nBerikut adalah daftar kemampuan bot untuk member:`,
                '#3498db'
            );

            const adminEmbed = baseEmbed(
                '🛡️ Menu Rahasia Administrator',
                `Ini adalah daftar perintah yang hanya bisa dieksekusi oleh Staf dan Administrator server.`,
                '#ED4245'
            );

            const commandsPath = path.join(__dirname, '..');
            const commandFolders = fs.readdirSync(commandsPath);

            const emojiMap = {
                'Admin': '🛡️', 'Economy': '💰', 'Anime': '🎌', 'Fun': '🎮', 
                'Gaming': '🕹️', 'Music': '🎵', 'Security': '🔒', 'Voice': '🎙️', 'Utility': '🛠️'
            };

            // Looping membaca folder
            for (const folder of commandFolders) {
                const folderPath = path.join(commandsPath, folder);
                
                if (fs.statSync(folderPath).isDirectory()) {
                    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                    
                    if (commandFiles.length > 0) {
                        const commandsArray = commandFiles.map(file => `\`${file.replace('.js', '')}\``);
                        let categoryName = folder.charAt(0).toUpperCase() + folder.slice(1);
                        const emoji = emojiMap[categoryName] || '📁';

                        const fieldData = {
                            name: `${emoji} ${categoryName}`,
                            value: commandsArray.join(', '),
                            inline: false
                        };

                        // Pisahkan field ke embed yang sesuai
                        if (adminFolders.includes(folder.toLowerCase())) {
                            adminEmbed.addFields(fieldData);
                        } else {
                            memberEmbed.addFields(fieldData);
                        }
                    }
                }
            }

            // Membuat Tombol Navigasi
            const btnToAdmin = new ButtonBuilder()
                .setCustomId('help_admin')
                .setLabel('🛡️ Menu Admin')
                .setStyle(ButtonStyle.Danger);

            const btnToMember = new ButtonBuilder()
                .setCustomId('help_member')
                .setLabel('🔙 Menu Member')
                .setStyle(ButtonStyle.Primary);

            const rowMember = new ActionRowBuilder().addComponents(btnToAdmin);
            const rowAdmin = new ActionRowBuilder().addComponents(btnToMember);

            // Mengirim Pesan Utama (Default Tampilan Member)
            // fetchReply: true diperlukan pada Slash Command agar kita bisa menyematkan Collector
            const response = isSlash 
                ? await context.reply({ embeds: [memberEmbed], components: [rowMember], fetchReply: true }) 
                : await context.reply({ embeds: [memberEmbed], components: [rowMember] });

            // Membuat Collector untuk mendengarkan klik tombol selama 60 detik
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                // Memastikan hanya orang yang memanggil command yang bisa menekan tombol
                if (i.user.id !== userId) {
                    return i.reply({ content: '❌ Ini bukan menu help milikmu! Silakan ketik perintah help sendiri.', flags: [MessageFlags.Ephemeral] });
                }

                // Logika jika tombol Admin ditekan
                if (i.customId === 'help_admin') {
                    if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                        return i.reply({ content: '❌ Kamu tidak memiliki izin Administrator untuk melihat menu rahasia ini!', flags: [MessageFlags.Ephemeral] });
                    }
                    await i.update({ embeds: [adminEmbed], components: [rowAdmin] });
                } 
                
                // Logika jika tombol kembali ke Member ditekan
                else if (i.customId === 'help_member') {
                    await i.update({ embeds: [memberEmbed], components: [rowMember] });
                }
            });

            // Setelah 60 detik berlalu, hilangkan tombol agar tidak error
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

            return;
        } 
        
        // ==================================================
        // SKENARIO 2: DETAIL SPESIFIK (Misal: lunar!help kick)
        // ==================================================
        else {
            const cmdNameLower = commandName.toLowerCase();
            const cmd = client.commands.get(cmdNameLower);

            if (!cmd) {
                const errEmbed = errorEmbed(
                    'Perintah Tidak Ditemukan', 
                    `Bot Lunar belum mempelajari perintah bernama \`${cmdNameLower}\`. Cek kembali ejaan Anda!`
                );
                return isSlash 
                    ? await context.reply({ embeds: [errEmbed], flags: [MessageFlags.Ephemeral] }) 
                    : await context.reply({ embeds: [errEmbed] });
            }

            let desc = cmd.data && cmd.data.description ? cmd.data.description : 'Tidak ada deskripsi.';

            const detailEmbed = baseEmbed(`🔎 Info Perintah: ${cmd.name}`, `Berikut adalah panduan cara menggunakan perintah ini.`)
                .addFields(
                    { name: '📝 Deskripsi', value: desc, inline: false },
                    { name: '💻 Cara Penggunaan', value: `**Prefix:** \`${prefix}${cmd.name}\`\n**Slash:** \`/${cmd.name}\``, inline: false }
                );

            return context.reply({ embeds: [detailEmbed] });
        }
    }
};