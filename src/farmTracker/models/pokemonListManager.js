const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class PokemonListManager {
    constructor() {
        // Determine the correct path based on the environment
        this.isDev = process.env.NODE_ENV === 'dev';
        this.csvFilePath = this.isDev
            ? path.join(__dirname, '..', '..', 'pokemon_names.csv')
            : path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'pokemon_names.csv');

        // Initialize Pokémon names as an empty Set
        this.pokemonSet = new Set();

        // Load Pokémon list during initialization
        return (async () => {
            await this.loadPokemonList();
            return this;
        })();
    }

    // Load Pokémon names from CSV into the Set
    async loadPokemonList() {
        const streamToPromise = (stream) => {
            return new Promise((resolve, reject) => {
                const result = [];
                stream
                    .on('data', (row) => {
                        if (row.Name) {
                            result.push(row.Name);
                        }
                    })
                    .on('end', () => resolve(result))
                    .on('error', reject);
            });
        };

        try {
            const fileStream = fs.createReadStream(this.csvFilePath);
            const pokemonArray = await streamToPromise(fileStream.pipe(csv()));
            this.pokemonSet = new Set(pokemonArray);
            console.log('Pokemon list successfully loaded.');
        } catch (error) {
            console.error('Error loading Pokémon list:', error);
            throw error;
        }
    }

    // Check if a Pokémon is in the Set
    isPokemonInSet(name) {
        try {
            return this.pokemonSet.has(name);
        } catch (error) {
            console.error('Error checking Pokémon in set:', error);
            throw error;
        }
    }
}

module.exports = PokemonListManager;
