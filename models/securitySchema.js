const mongoose = require('mongoose');

const securitySchema = new mongoose.Schema({
    configId: { type: String, default: 'global', unique: true }, // Untuk menyimpan satu config utama
    badWords: { type: [String], default: [] }
});

module.exports = mongoose.model('Security', securitySchema);
