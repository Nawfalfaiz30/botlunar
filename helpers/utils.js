module.exports = {
    /**
     * Mendapatkan angka acak (Digunakan untuk ekonomi, damage, atau gacha)
     * @param {number} min - Nilai minimum
     * @param {number} max - Nilai maksimum
     * @returns {number} - Angka acak
     */
    getRandomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Mengambil elemen acak dari sebuah array (Digunakan untuk quote atau respon AI)
     * @param {Array} array - Array sumber
     * @returns {*} - Satu elemen acak dari array
     */
    getRandomElement: (array) => {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Mengubah milidetik menjadi format waktu yang mudah dibaca (Digunakan untuk AFK, Timeout, Music)
     * @param {number} ms - Durasi dalam milidetik
     * @returns {string} - Contoh: "1 Hari 2 Jam 30 Menit"
     */
    formatDuration: (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        let result = '';
        if (days > 0) result += `${days} Hari `;
        if (hours > 0) result += `${hours} Jam `;
        if (minutes > 0) result += `${minutes} Menit `;
        if (seconds > 0) result += `${seconds} Detik`;
        
        return result.trim() || '0 Detik';
    }
};