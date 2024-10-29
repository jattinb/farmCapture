// Function to detect valid encounter using OCR result
const checkValidEncounter = (text) => {
    const words = text.toLowerCase().split(/\W+/);
    const vsIndex = words.indexOf('vs');

    // Define Pokémon names that may have suffixes
    const suffixes = ['m', 'f', 'mime', 'rime', 'jr', 'z', 'o']; // Add more suffixes if needed, e.g., 'alpha', 'beta'
    const knownPokemonWithSuffixes = ['nidoran']; // Add other Pokémon names as needed

    if (vsIndex !== -1 && vsIndex < words.length - 1) {
        const nextWord = words[vsIndex + 1];

        // Check for "wild" followed by the Pokémon name or a merged "wildpokemon"
        if (nextWord === 'wild' && vsIndex + 2 < words.length) {
            let curPoke = words[vsIndex + 2];

            // Check if the detected Pokémon name has a suffix
            if (knownPokemonWithSuffixes.includes(curPoke) && vsIndex + 3 < words.length) {
                const potentialSuffix = words[vsIndex + 3];
                if (suffixes.includes(potentialSuffix)) {
                    curPoke = `${curPoke}-${potentialSuffix}`;
                }
            }

            console.log('Encounter found:', curPoke);
            return { valid: true, curPoke };
        } else if (nextWord.startsWith('wild')) {
            let pokemonName = nextWord.substring(4); // Extract the Pokémon name after "wild"

            // Check if the detected Pokémon name has a suffix
            if (knownPokemonWithSuffixes.includes(pokemonName) && vsIndex + 2 < words.length) {
                const potentialSuffix = words[vsIndex + 2];
                if (suffixes.includes(potentialSuffix)) {
                    pokemonName = `${pokemonName}-${potentialSuffix}`;
                }
            }

            console.log('Encounter found:', pokemonName);
            return { valid: true, curPoke: pokemonName };
        }
    }

    return { valid: false, curPoke: null };
};

module.exports = checkValidEncounter;
