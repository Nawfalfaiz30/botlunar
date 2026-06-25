const { SlashCommandBuilder } = require('discord.js');
const { warningEmbed, successEmbed, errorEmbed } = require('../../helpers/embed.js');
const { formatDuration, getRandomInt, getRandomElement } = require('../../helpers/utils.js');
const User = require('../../models/userSchema.js'); // 🟢 Import model MongoDB

// Data statis
const invDb = require('../../data/inv.json'); // Database item/buff

module.exports = {
    name: 'work',
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Bekerja untuk mendapatkan koin.'),

    async executeSlash(interaction) { await this.processWork(interaction, interaction.user, true); },
    async executePrefix(message) { await this.processWork(message, message.author, false); },

    async processWork(context, user, isSlash) {
        try {
            // 1. Ambil data User dari MongoDB
            let userData = await User.findOne({ userId: user.id });
            if (!userData) userData = await User.create({ userId: user.id, koin: 0, inventory: [], effects: {}, area: 1 });
            
            if (!userData.cooldowns) userData.cooldowns = {};
            const now = Date.now();

            // 2. Bersihkan buff expired & hitung bonus
            let bonusGaji = 0;
            let potongCooldown = 0;

            const effects = userData.effects instanceof Map ? Object.fromEntries(userData.effects) : (userData.effects || {});
            
            for (const key in effects) {
                if (effects[key].expiresAt < now) {
                    delete userData.effects[key];
                } else {
                    const itemMaster = Object.values(invDb).find(i => i.type === key);
                    if (itemMaster && itemMaster.modifier) {
                        if (itemMaster.modifier.work_bonus) bonusGaji += itemMaster.modifier.work_bonus;
                        if (itemMaster.modifier.cooldown_cut) potongCooldown += itemMaster.modifier.cooldown_cut;
                    }
                }
            }

            // 3. Sistem Cooldown
            let cooldown = 3600000; // 1 Jam base
            if (potongCooldown > 0) cooldown -= (cooldown * potongCooldown / 100);

            const lastWork = userData.cooldowns.lastWork || 0;
            if (now - lastWork < cooldown) {
                const timeLeft = cooldown - (now - lastWork);
                const warn = warningEmbed('Kamu Sedang Lelah!', `Istirahat dulu dan kembali dalam **${formatDuration(timeLeft)}**.`);
                return isSlash ? context.reply({ embeds: [warn], ephemeral: true }) : context.reply({ embeds: [warn] });
            }

            // 4. Perhitungan Gaji
            const jobs = ['Programmer Handal', 'Kasir Minimarket', 'Petani Desa', 'Pemburu Bounty', 'Kurir Paket', 'Nelayan Laut Dalam','Penambang Batu Bara','Peternak Ayam','Pengemudi Ojek','Supir Truk Logistik','Barista Kedai Kopi','Koki Restoran',
                'Pelayan Restoran','Satpam Perumahan','Pemadam Kebakaran','Dokter Klinik','Perawat Rumah Sakit','Guru Sekolah','Dosen Universitas','Teknisi Komputer','Desainer Grafis','Streamer Gaming',
                'Youtuber Pemula','Fotografer Pernikahan','Jurnalis Lapangan','Arsitek Bangunan','Mekanik Bengkel','Pilot Pesawat','Pramugara Pesawat','Nahkoda Kapal','Penyelam Profesional','Penjaga Mercusuar','Peneliti Laboratorium','Astronom Observatorium',
                'Penjaga Kebun Binatang','Pemandu Wisata','Detektif Swasta','Agen Rahasia','Pemburu Harta Karun','Penjelajah Dungeon','Pembasmi Monster','Ksatria Kerajaan','Penyihir Akademi Sihir','Alkemis Kota',
                'Penempa Senjata','Penjaga Istana','Pedagang Keliling','Pemungut Pajak Kerajaan','Penjaga Perpustakaan Kuno','Kurir Kerajaan','Penjinak Naga','Penjaga Gerbang Kota','Ahli Ramuan','Pemburu Artefak Kuno','Peneliti Relik','Navigator Kapal Udara',
                'Penjaga Menara Sihir','Pencari Kristal Mana','Mercenary Veteran','Pedagang Rempah','Tukang Kayu','Tukang Bangunan','Penjahit Profesional','Pandai Besi','Pengrajin Perhiasan','Pemetik Teh','Petani Gandum','Pengelola Perkebunan','Penjual Es Krim',
                'Penjual Bakso','Pengusaha Kuliner','Investor Pemula','Analis Keuangan','Manajer Perusahaan','CEO Startup'];
            
            const baseReward = getRandomInt(200, 500);
            let totalReward = baseReward;
            
            if (bonusGaji > 0) {
                totalReward += Math.floor(baseReward * bonusGaji / 100);
            }

            const multiplier = userData.area || 1;
            const finalReward = totalReward * multiplier;

            // 5. Simpan Data ke MongoDB
            userData.lastWork = now;
            userData.cooldowns.lastWork = now;
            userData.koin += finalReward;
            await userData.save();

            // 6. Output Pesan
            const areaInfo = multiplier > 1 ? ` (Bonus Area x${multiplier})` : '';
            const replyMsg = successEmbed(
                '💼 Kerja Selesai!', 
                `Kamu menjadi **${getRandomElement(jobs)}** di Area ${userData.area}.\n\n` +
                `💸 **Gaji:** 🪙 ${finalReward} Koin${areaInfo}\n` +
                `💰 **Total Saldo:** ${userData.koin} Koin`
            );
            
            return context.reply({ embeds: [replyMsg] });

        } catch (error) {
            console.error('[ERROR WORK MONGODB]', error);
            return context.reply({ embeds: [errorEmbed('Gagal', 'Terjadi kesalahan sistem saat bekerja.')] });
        }
    }
};