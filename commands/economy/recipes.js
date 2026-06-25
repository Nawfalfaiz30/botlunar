const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Mengimpor data dari file statis
const recipesDb = require('../../data/recipes.json');
const itemsDb = require('../../data/items.json');
const shopDb = require('../../data/shop.json');

module.exports = {
    name: 'recipes',
    aliases: ['resep', 'recipe', 'cooking'],
    data: new SlashCommandBuilder()
        .setName('recipes')
        .setDescription('📖 Melihat daftar resep cooking/memasak beserta statistiknya.'),

    async executeSlash(interaction) { await this.processRecipes(interaction); },
    async executePrefix(message) { await this.processRecipes(message); },

    normalize(text) {
        return text.toLowerCase().replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[^a-z0-9\s]/gi, '').trim();
    },

    async processRecipes(context) {
        // Gabungkan data untuk pencarian stats
        const allItems = { ...itemsDb, ...shopDb };
        
        // 1. Siapkan data resep dengan stats
        const recipeList = Object.values(recipesDb).map(r => {
            const resultItem = Object.values(allItems).find(i => this.normalize(i.nama) === this.normalize(r.hasil));
            let statText = "";
            if (resultItem?.stats) {
                const s = resultItem.stats;
                const parts = [];
                if (s.attack) parts.push(`⚔️ +${s.attack}`);
                if (s.defense) parts.push(`🛡️ +${s.defense}`);
                if (s.hp) parts.push(`❤️ +${s.hp}`);
                statText = parts.length > 0 ? `| ${parts.join(' ')}` : "";
            }
            return { ...r, statText };
        });

        // 2. Logika Paginasi
        const itemsPerPage = 5;
        const totalPages = Math.ceil(recipeList.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentRecipes = recipeList.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('🔨 Buku Resep & Statistik')
                .setColor('#F1C40F')
                .setDescription(`Gunakan \`lunar!cook <nama>\` untuk membuat item.\nMenampilkan ${start + 1}-${Math.min(end, recipeList.length)} dari ${recipeList.length} resep.`);

            currentRecipes.forEach(r => {
                const bahanList = Object.entries(r.bahan)
                    .map(([nama, jml]) => `\`${jml}x\` ${nama}`)
                    .join(', ');
                
                embed.addFields({ 
                    name: `${r.hasil} ${r.statText}`, 
                    value: `> 📋 Bahan: ${bahanList}`, 
                    inline: false 
                });
            });

            return embed;
        };

        const getButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('Sebelumnya').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Selanjutnya').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
        );

        const response = await context.reply({ 
            embeds: [generateEmbed(0)], 
            components: totalPages > 1 ? [getButtons(0)] : [] 
        });

        // 3. Collector untuk Navigasi
        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async (i) => {
                const userId = context.user?.id || context.author?.id;
                if (i.user.id !== userId) return i.reply({ content: 'Ini bukan punyamu!', ephemeral: true });

                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;

                await i.update({ 
                    embeds: [generateEmbed(currentPage)], 
                    components: [getButtons(currentPage)] 
                });
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });
        }
    }
};