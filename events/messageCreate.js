const {
    Events,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { getRandomInt } = require('../helpers/utils.js'); // readJSON & writeJSON dihapus
const { errorEmbed } = require('../helpers/embed.js');
const { addXP } = require('../helpers/economyHelper.js'); // Sekarang wajib pakai await
const User = require('../models/userSchema.js'); // 🟢 Import model User
const Guild = require('../models/guildSchema.js'); // 🟢 Import model Guild
require('dotenv').config();

const prefix = (process.env.PREFIX || 'lunar!').toLowerCase();

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client) {
        // Abaikan bot / DM
        if (message.author.bot || !message.guild) return;

        // ==================================================
        // 1. INTERCEPTOR RUANG CONFESS
        // ==================================================
        if (message.channel.name && message.channel.name.startsWith('confess-')) {
            const content = message.content?.trim();
            await message.delete().catch(() => {});

            if (!content) {
                const warnMsg = await message.channel.send('⚠️ Tolong kirim confess dalam bentuk **teks**.');
                setTimeout(() => warnMsg.delete().catch(() => {}), 3000);
                return;
            }

            try {
                const messages = await message.channel.messages.fetch({ limit: 10 });
                const oldPreview = messages.find(
                    msg => msg.author.id === client.user.id && msg.components.length > 0
                );

                if (oldPreview) await oldPreview.delete().catch(() => {});

                const previewEmbed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('👀 Preview Confess')
                    .setDescription(`## ${content}`)
                    .setFooter({ text: 'Periksa kembali isi confess kamu sebelum mengirim.' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('send_confess').setLabel('📨 Kirim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('rewrite_confess').setLabel('✍️ Tulis Ulang').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('cancel_confess').setLabel('❌ Batalkan').setStyle(ButtonStyle.Danger)
                );

                return message.channel.send({ embeds: [previewEmbed], components: [row] });
            } catch (error) {
                console.error('[CONFESS PREVIEW ERROR]', error);
                return message.channel.send('❌ Terjadi kesalahan saat membuat preview confess.');
            }
        }

        // ==================================================
        // 2. AUTOMOD (Filter Kata Kasar)
        // ==================================================
        let guildData = null; // Kita cache guildData di sini untuk dipakai di bawah juga
        try {
            guildData = await Guild.findOne({ guildId: message.guild.id });
            const badWords = guildData?.badWords || []; // 🟢 Ambil dari MongoDB (Per-Server)

            if (badWords.length > 0) {
                const content = message.content.toLowerCase();
                const triggeredWord = badWords.find(word => new RegExp(`\\b${word}\\b`, 'i').test(content));

                if (triggeredWord) {
                    if (message.channel.permissionsFor(message.guild.members.me)?.has(PermissionsBitField.Flags.ManageMessages)) {
                        await message.delete().catch(() => {});
                    }

                    const warnEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setDescription(`⚠️ **Peringatan AutoMod**\nHai ${message.author}, pesan kamu telah dihapus karena mengandung kata terlarang.\n\n**Terdeteksi:** \`${triggeredWord}\``);

                    const warningMsg = await message.channel.send({ embeds: [warnEmbed] });
                    setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
                    console.log(`[AUTOMOD] ${message.author.tag} mengirim kata terlarang: ${triggeredWord}`);
                    return;
                }
            }
        } catch (err) {
            console.error('[AUTOMOD ERROR]', err);
        }

        // ==================================================
        // 3. SISTEM AFK
        // ==================================================
        try {
            const getDurationString = startTime => {
                const duration = Date.now() - startTime;
                const s = Math.floor((duration / 1000) % 60);
                const m = Math.floor((duration / (1000 * 60)) % 60);
                const h = Math.floor((duration / (1000 * 60 * 60)) % 24);
                const d = Math.floor(duration / (1000 * 60 * 60 * 24));

                let timeStr = '';
                if (d > 0) timeStr += `${d} hari `;
                if (h > 0) timeStr += `${h} jam `;
                if (m > 0) timeStr += `${m} menit `;
                if (s > 0 || timeStr === '') timeStr += `${s} detik`;
                return timeStr.trim();
            };

            // A. Cek jika User kembali dari AFK
            let authorData = await User.findOne({ userId: message.author.id });
            if (authorData && authorData.afk && authorData.afk.isAfk) {
                const afkData = authorData.afk;
                const timeAwayStr = getDurationString(afkData.time);
                const mentionsCount = afkData.mentions ? afkData.mentions.length : 0;

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle(`👋 Selamat datang kembali, ${message.author.username}!`)
                    .setDescription(`Status AFK kamu telah dicabut. Kamu AFK selama **${timeAwayStr}**.`);

                if (mentionsCount > 0) {
                    const recentMentions = afkData.mentions.slice(-5);
                    let mentionsText = '';

                    recentMentions.forEach((m, index) => {
                        mentionsText += `**${index + 1}. ${m.by}** di ${m.channel}\n💬 *"${m.content}"*\n🔗 [Lompat ke pesan](${m.link})\n\n`;
                    });

                    if (mentionsCount > 5) mentionsText += `*...dan ${mentionsCount - 5} mention lainnya tidak ditampilkan.*`;
                    welcomeEmbed.addFields({ name: `🔔 Kamu mendapat ${mentionsCount} Mention saat pergi:`, value: mentionsText });
                } else {
                    welcomeEmbed.addFields({ name: '🔔 Notifikasi', value: 'Tidak ada yang nge-tag kamu selama pergi. Aman! 😴' });
                }

                // Reset AFK status
                authorData.afk = undefined;
                await authorData.save();

                await message.channel.send({ content: `<@${message.author.id}>`, embeds: [welcomeEmbed] });
            }

            // B. Mention user yang sedang AFK
            if (message.mentions.users.size > 0) {
                // Menggunakan for...of agar await bekerja dengan benar
                for (const mentionedUser of message.mentions.users.values()) {
                    if (mentionedUser.id === message.author.id) continue;

                    let mentionedData = await User.findOne({ userId: mentionedUser.id });
                    if (mentionedData && mentionedData.afk && mentionedData.afk.isAfk) {
                        const afkData = mentionedData.afk;
                        const timeAwayStr = getDurationString(afkData.time);

                        if (!afkData.mentions) afkData.mentions = [];
                        const msgContent = message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content;

                        afkData.mentions.push({
                            by: message.author.username,
                            channel: `<#${message.channel.id}>`,
                            content: msgContent,
                            link: message.url
                        });

                        await mentionedData.save(); // Simpan riwayat mention ke DB

                        const afkReply = await message.reply({
                            content: `💤 **${mentionedUser.username}** sudah AFK selama **${timeAwayStr}**.\n📝 *"${afkData.reason || 'Ada urusan sebentar.'}"*`
                        });
                        setTimeout(() => afkReply.delete().catch(() => {}), 7000);
                    }
                }
            }
        } catch (err) {
            console.error('[ERROR AFK SYSTEM]', err);
        }

        // ==================================================
        // 4. XP & LEVELING SYSTEM
        // ==================================================
        try {
            const userId = message.author.id;
            const xpEarned = getRandomInt(15, 25);

            // 🟢 WAJIB AWAIT KARENA HELPER SEKARANG TERKONEKSI KE MONGODB
            const xpResult = await addXP(userId, xpEarned); 

            if (xpResult?.leveledUp) {
                const levelChannelId = guildData?.levelChannel; // Menggunakan guildData yang di-fetch di step 2
                let targetChannel = message.channel;

                if (levelChannelId) {
                    const setupChannel = message.guild.channels.cache.get(levelChannelId);
                    if (setupChannel) targetChannel = setupChannel;
                }

                await targetChannel.send(
                    `🎉 Selamat ${message.author}! Kamu telah mencapai **Level ${xpResult.newLevel}**!\n*Statistikmu telah meningkat (HP/ATK/DEF).*`
                );
            }
        } catch (err) {
            console.error('[LEVELING ERROR]', err);
        }

        // ==================================================
        // 5. PREFIX COMMAND HANDLER
        // ==================================================
        const messageLower = message.content.toLowerCase();
        if (!messageLower.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        
        if (!commandName) return;

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            if (typeof command.executePrefix === 'function') {
                await command.executePrefix(message, args, client);
            } else if (typeof command.execute === 'function') {
                await command.execute(message, args, client);
            }
        } catch (error) {
            console.error(`[COMMAND ERROR] ${commandName}`, error);
            await message.reply({
                embeds: [errorEmbed('❌ Gagal Mengeksekusi', 'Terjadi kesalahan internal saat menjalankan perintah.')]
            });
        }
    }
};