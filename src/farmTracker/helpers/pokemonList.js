const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Determine the correct path based on the environment
const isDev = process.env.NODE_ENV === 'development';
const csvFilePath = isDev
    ? path.join(__dirname, '..', '..', 'pokemon_names.csv')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'pokemon_names.csv');

// Function to read Pokémon names from CSV and return as a Set
async function loadPokemonList() {
    // Utility function to convert stream to promise
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
        const fileStream = await fs.createReadStream(csvFilePath);
        const pokemonArray = await streamToPromise(fileStream.pipe(csv()));
        return pokemonArray;
    } catch (error) {
        console.error('Error loading Pokémon list:', error);
        throw error; // Re-throw error for further handling
    }
}

// Function to check if Pokémon is in the set
function isPokemonInSet(name, pokemonSet) {
    try {
        return pokemonSet.has(name);
    } catch (error) {
        console.error('Error checking Pokémon in set:', error);
        throw error; // Re-throw error for further handling
    }
}

module.exports = { loadPokemonList, isPokemonInSet };
