const User = require('../models/userSchema.js');

module.exports = {
    /**
     * Mengambil profil pengguna dari MongoDB
     */
    getProfile: async (userId) => {
        let user = await User.findOne({ userId: userId });
        if (!user) {
            user = await User.create({ userId: userId });
        }
        return user;
    },

    /**
     * Menambahkan koin (Atomic Update)
     */
    addKoin: async (userId, amount) => {
        if (amount <= 0) return 0;
        
        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $inc: { koin: amount } },
            { returnDocument: 'after', upsert: true }
        );
        return user.koin;
    },

    /**
     * Mengurangi koin (Atomic Update dengan pengecekan saldo)
     */
    removeKoin: async (userId, amount) => {
        if (amount <= 0) return false;
        
        // Memastikan saldo cukup sebelum dipotong
        const user = await User.findOneAndUpdate(
            { userId: userId, koin: { $gte: amount } },
            { $inc: { koin: -amount } },
            { returnDocument: 'after' }
        );
        
        return !!user; // Return true jika berhasil dipotong, false jika saldo kurang
    },

    /**
     * Menambahkan XP dan proses Level Up
     */
    addXP: async (userId, amount) => {
        if (amount <= 0) return { leveledUp: false, newLevel: 1, currentXP: 0 };

        const user = await User.findOne({ userId: userId });
        if (!user) return { leveledUp: false, newLevel: 1, currentXP: 0 };
        
        user.xp += amount;
        
        let leveledUp = false;
        let xpDibutuhkan = user.level * 100; 
        
        while (user.xp >= xpDibutuhkan) {
            user.xp -= xpDibutuhkan;
            user.level += 1;
            
            // RPG Stat Scaling
            user.stats.maxHp += 10;
            user.stats.hp = user.stats.maxHp; 
            user.stats.attack += 2;
            user.stats.defense += 1;

            leveledUp = true;
            xpDibutuhkan = user.level * 100; 
        }
        
        await user.save();
        
        return {
            leveledUp: leveledUp,
            newLevel: user.level,
            currentXP: user.xp
        };
    },

    /**
     * Update HP (Heal / Damage)
     */
    updateHP: async (userId, amount) => {
        const user = await User.findOne({ userId: userId });
        if (!user) return { hpSekarang: 0, isDead: true };

        user.stats.hp += amount;

        // Clamp HP
        if (user.stats.hp > user.stats.maxHp) user.stats.hp = user.stats.maxHp;
        
        let isDead = false;
        if (user.stats.hp <= 0) {
            user.stats.hp = 0;
            isDead = true;
        }

        await user.save();
        return { hpSekarang: user.stats.hp, isDead: isDead };
    }
};