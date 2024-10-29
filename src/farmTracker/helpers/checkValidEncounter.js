// Function to detect valid encounter using OCR result
const checkValidEncounter = (text) => {
    const words = text.toLowerCase().split(/\W+/);
    console.log(text);

    // Define Pokémon names that may have suffixes
    const suffixes = ['m', 'f', 'mime', 'rime', 'jr', 'z', 'o']; // Add more suffixes if needed, e.g., 'alpha', 'beta'
    const knownPokemonWithSuffixes = ['nidoran']; // Add other Pokémon names as needed

    // Look for "wild" in the words array
    const wildIndex = words.indexOf('wild');
    if (wildIndex !== -1 && wildIndex < words.length - 1) {
        let curPoke = words[wildIndex + 1];

        // Check if the detected Pokémon name has a suffix
        if (knownPokemonWithSuffixes.includes(curPoke) && wildIndex + 2 < words.length) {
            const potentialSuffix = words[wildIndex + 2];
            if (suffixes.includes(potentialSuffix)) {
                curPoke = `${curPoke}-${potentialSuffix}`;
            }
        }

        console.log('Encounter found:', curPoke);
        return { valid: true, curPoke };
    } else if (wildIndex !== -1 && words[wildIndex + 1].startsWith('wild')) {
        // Handle merged "wildpokemon" case
        let pokemonName = words[wildIndex + 1].substring(4); // Extract the Pokémon name after "wild"

        // Check if the detected Pokémon name has a suffix
        if (knownPokemonWithSuffixes.includes(pokemonName) && wildIndex + 2 < words.length) {
            const potentialSuffix = words[wildIndex + 2];
            if (suffixes.includes(potentialSuffix)) {
                pokemonName = `${pokemonName}-${potentialSuffix}`;
            }
        }

        console.log('Encounter found:', pokemonName);
        return { valid: true, curPoke: pokemonName };
    }

    return { valid: false, curPoke: null };
};

module.exports = checkValidEncounter;
