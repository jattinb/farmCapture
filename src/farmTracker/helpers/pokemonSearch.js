const Fuse = require('fuse.js');

function findPokemon(name, pokemonList) {

    const pokemonListArray = pokemonList;

    // Set up Fuse.js options
    const options = {
        includeScore: true,
        threshold: 0.3, // Adjust the threshold as needed
    };

    // Create a Fuse instance with the Pokémon list
    const fuse = new Fuse(pokemonListArray, options);

    // Search for the closest match
    const result = fuse.search(name);

    // Return the closest match or a fallback if nothing found
    return result.length > 0 ? result[0].item : 'No match found';
}

module.exports = { findPokemon };  
