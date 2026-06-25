const mongoose = require('mongoose');

// 1. Buat Schema-nya terlebih dahulu
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    koin: { type: Number, default: 5000 },
    inventory: { type: [String], default: [] },
    area: { type: Number, default: 1 },
    stats: {
        hp: { type: Number, default: 100 },
        maxHp: { type: Number, default: 100 },
        attack: { type: Number, default: 10 },
        defense: { type: Number, default: 5 }
    },
    gear: {
        weapon: { type: String, default: null },
        armor: { type: String, default: null },
        pancing: { type: String, default: null },
        pickaxe: { type: String, default: null },
        kapak: { type: String, default: null }
    },
    effects: { type: Object, default: {} },
    cooldowns: {
        lastHunt: { type: Number, default: 0 },
        lastChop: { type: Number, default: 0 },
        lastMine: { type: Number, default: 0 },
        lastFish: { type: Number, default: 0 },
        lastDungeon: { type: Number, default: 0 },
        lastWork: { type: Number, default: 0 },
        lastRob: { type: Number, default: 0 },
        lastDaily: { type: Number, default: 0 }
    },
    birthday: { type: String, default: null },
    afk: {
        isAfk: { type: Boolean, default: false },
        reason: String,
        time: Number,
        mentions: { type: [{ type: Object }], default: [] } // ✅ UBAH JADI SEPERTI INI
    }
});

// 2. Tambahkan index SETELAH variabel userSchema dibuat
userSchema.index({ level: -1, xp: -1 });

// 3. Ekspor modelnya
module.exports = mongoose.model('User', userSchema);