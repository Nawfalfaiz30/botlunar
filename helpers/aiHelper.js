const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

// Mengambil API Key dari file .env
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

// Menyiapkan instance Anthropic
let anthropic = null;

if (apiKey && apiKey !== 'masukkan_api_key_ai_di_sini') {
    anthropic = new Anthropic({
        apiKey: apiKey,
    });
}

// Menentukan model Claude (Ganti tag ini sesuai dengan rilis API resmi Anthropic untuk versi yang Anda maksud)
const MODEL_NAME = 'claude-3-5-sonnet-20241022'; 

module.exports = {
    /**
     * Meminta AI untuk menjawab pertanyaan teks biasa (Untuk fitur !ai)
     * @param {string} prompt - Pertanyaan atau pesan dari member
     * @returns {Promise<string>} - Balasan dari AI
     */
    askAI: async (prompt) => {
        if (!anthropic) return '❌ API Key Anthropic belum diatur di dalam file `.env`! Minta admin untuk mengisinya.';
        
        try {
            const response = await anthropic.messages.create({
                model: MODEL_NAME,
                max_tokens: 1024,
                messages: [
                    { role: 'user', content: prompt }
                ]
            });
            
            return response.content[0].text;
        } catch (error) {
            console.error('[ERROR AI]', error);
            return '❌ Maaf, otak AI Lunar (Claude) sedang mengalami gangguan saat ini.';
        }
    },

    /**
     * Meminta AI untuk menghasilkan data terstruktur dalam bentuk JSON 
     * (Sangat berguna untuk fitur Gacha Waifu, Tebak Anime, Quote, dan Trivia)
     * @param {string} formatInstruction - Instruksi ke AI agar membalas dengan format tertentu
     * @param {string} prompt - Topik yang diminta
     * @returns {Promise<object|null>} - Objek JavaScript (hasil parse JSON) atau null jika gagal
     */
    generateJSON: async (formatInstruction, prompt) => {
        if (!anthropic) {
            console.error('[ERROR AI] API Key belum diatur!');
            return null;
        }

        try {
            // Menggabungkan instruksi format dengan prompt pengguna, dengan instruksi ketat untuk Claude
            const fullPrompt = `${formatInstruction}\n\nTopik/Permintaan: ${prompt}\n\nPENTING: Balas HANYA dengan format JSON murni. Jangan gunakan blok kode markdown (\`\`\`json). Jangan berikan teks pengantar atau penutup apapun.`;
            
            const response = await anthropic.messages.create({
                model: MODEL_NAME,
                max_tokens: 2000,
                messages: [
                    { role: 'user', content: fullPrompt }
                ]
            });
            
            const textResponse = response.content[0].text;
            
            // Membersihkan sisa markdown jika Claude masih mengirimkan blok kode
            const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error('[ERROR AI JSON]', error);
            return null;
        }
    }
};