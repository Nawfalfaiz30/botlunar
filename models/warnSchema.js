const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    warnings: [
        {
            reason: { type: String, default: 'Tidak ada alasan.' },
            moderatorId: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('Warning', warnSchema);