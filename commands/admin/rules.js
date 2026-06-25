const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { baseEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'rules',
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('🛡️ [ADMIN] Mengirimkan teks format peraturan (Rules) standar komunitas ke channel ini.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang berwenang memasang peraturan!')], ephemeral: true });
        }
        await this.deployRules(interaction, true);
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Kamu tidak memiliki otoritas Administrator!')] });
        }
        await this.deployRules(message, false);
    },

    async deployRules(context, isSlash) {
        const channel = isSlash ? context.channel : context.channel;

        // Membuat kerangka aturan yang indah menggunakan sistem Fields di Embed
        const rulesEmbed = baseEmbed(
            `📜 PERATURAN KOMUNITAS ${context.guild.name.toUpperCase()}`,
            `Selamat datang di **${context.guild.name}**! Untuk menjaga kenyamanan bersama, seluruh member wajib mematuhi seluruh peraturan yang berlaku di bawah ini. Pelanggaran akan dikenakan sanksi tegas.`
        )
        .setColor('#2b2d31') // Warna abu gelap elegan agar menyatu dengan Discord
        .setThumbnail(context.guild.iconURL({ dynamic: true, size: 256 }));

        rulesEmbed.addFields(
            { 
                name: '🤝 1. Etika & Hormati Sesama', 
                value: '• Saling menghormati antar sesama member server.\n• Dilarang keras melakukan tindakan perundungan (*bullying*), pelecehan, rasisme, SARA, serta ujaran kebencian (*hate speech*).',
                inline: false 
            },
            { 
                name: '💬 2. Penggunaan Teks Channel', 
                value: '• Gunakan channel sesuai dengan fungsinya (jangan mengirim meme di channel diskusi serius).\n• Dilarang melakukan *spamming* pesan, emoji besar secara berlebihan, ataupun *caps lock* beruntun.',
                inline: false 
            },
            { 
                name: '🎙️ 3. Etika Voice Channel', 
                value: '• Dilarang melakukan *earrape*, memutar musik bising lewat mikrofon, atau sengaja mengganggu kenyamanan member lain di dalam ruang suara.',
                inline: false 
            },
            { 
                name: '🔒 4. Keamanan & Promosi', 
                value: '• Dilarang keras menyebarkan link ilegal, virus, *malware*, konten pornografi (NSFW), serta melakukan pencurian data pribadi (*doxxing*).\n• Dilarang mempromosikan server Discord lain atau produk komersial tanpa izin tertulis dari staf/admin.',
                inline: false 
            },
            { 
                name: '⚖️ 5. Penegakan Sanksi', 
                value: '• **Pelanggaran Ringan:** Teguran lisan / Sistem *Warn*.\n• **Pelanggaran Sedang:** *Timeout* (Bisu otomatis) selama 1 - 7 hari.\n• **Pelanggaran Berat:** Diusir langsung (*Kick*) atau pemblokiran permanen (*Ban*).',
                inline: false 
            }
        )
        .setFooter({ text: `⚖️ Peraturan ini dapat berubah sewaktu-waktu demi kebaikan server.`, iconURL: context.guild.iconURL() });

        try {
            // Mengirimkan peraturan utama ke channel
            await channel.send({ embeds: [rulesEmbed] });

            // Mengirimkan pesan konfirmasi sukses
            const confirmEmbed = successEmbed('Rules Terpasang!', 'Papan peraturan komunitas berhasil dipasang di channel ini.');
            
            if (isSlash) {
                await context.reply({ embeds: [confirmEmbed], ephemeral: true });
            } else {
                const msg = await context.reply({ embeds: [confirmEmbed] });
                // Hapus pesan konfirmasi prefix dalam 3 detik agar channel tetap steril dari sisa chat
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            }
        } catch (error) {
            console.error('[ERROR RULES COMMAND]', error);
            const errReply = errorEmbed('Gagal Memasang Rules', 'Bot tidak dapat mengirimkan pesan. Cek izin akses bot di channel ini!');
            return isSlash ? await context.reply({ embeds: [errReply], ephemeral: true }) : await context.reply({ embeds: [errReply] });
        }
    }
};