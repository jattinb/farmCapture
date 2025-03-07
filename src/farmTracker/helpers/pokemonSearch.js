const Fuse = require('fuse.js');

function findPokemon(name, pokemonList) {
    const pokemonListArray = pokemonList;

    // Set up Fuse.js options
    const options = {
        includeScore: true,
        threshold: 0.3, // Adjust the threshold as needed
    };

    // Preprocessing: Normalize known suffix cases
    const normalizedName = name.toLowerCase();
    if (normalizedName === 'nidoranm' || normalizedName === 'nidoran m') {
        name = 'nidoran-m';
    } else if (normalizedName === 'nidoranf' || normalizedName === 'nidoran f') {
        name = 'nidoran-f';
    }

    // Create a Fuse instance with the Pokémon list
    const fuse = new Fuse(pokemonListArray, options);

    // Search for the closest match
    const result = fuse.search(name);
    // console.log("Name", name, "Result:", result)
    if (result.length === 0) {
        return 'No match found';
    }

    // Get the highest score
    const highestScore = result[0].score;

    // Filter out results with the same highest score
    const topMatches = result.filter(item => item.score === highestScore);

    // If there's more than one match with the same highest score, return 'No match found'
    if (topMatches.length > 1) {
        return 'No match found';
    }

    // Otherwise, return the closest match
    return topMatches[0].item.replace(/\s+/g, '-');
}

module.exports = { findPokemon };
