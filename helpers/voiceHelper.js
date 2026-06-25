// Menggunakan struktur data Set untuk menyimpan ID secara efisien dan unik
const tempChannels = new Set();

module.exports = {
    /**
     * Mendaftarkan channel baru ke dalam memori bot
     * @param {string} channelId - ID dari Voice Channel sementara
     */
    addTempChannel: (channelId) => {
        tempChannels.add(channelId);
    },

    /**
     * Menghapus channel dari memori setelah channelnya benar-benar dihapus di Discord
     * @param {string} channelId - ID dari Voice Channel sementara
     */
    removeTempChannel: (channelId) => {
        tempChannels.delete(channelId);
    },

    /**
     * Mengecek apakah sebuah channel adalah hasil buatan (Temp Voice)
     * @param {string} channelId - ID dari Voice Channel
     * @returns {boolean} - True jika merupakan channel buatan bot
     */
    isTempChannel: (channelId) => {
        return tempChannels.has(channelId);
    }
};