const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    antiLink: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    welcomeChannel: { type: String, default: null },
    goodbyeChannel: { type: String, default: null },
    logChannel: { type: String, default: null },
    ticketCategory: { type: String, default: null },
    confessCategory: { type: String, default: null },
    confessChannel: { type: String, default: null },
    levelChannel: { type: String, default: null },
    // 🟢 Tambahkan ini
    badWords: { type: [String], default: [] }
});

module.exports = mongoose.model('Guild', guildSchema);