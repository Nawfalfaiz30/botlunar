const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ BERHASIL CONNECT!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ GAGAL:", err.message);
        process.exit(1);
    });