// Function to detect valid encounter using OCR result
const checkValidEncounter = (text) => {
    const words = text.toLowerCase().split(/\W+/);
    console.log(text);

    // Define Pokémon names that may have suffixes
    const suffixes = ['m', 'f', 'mime', 'rime', 'jr', 'z', 'o']; // Add more suffixes if needed
    const knownPokemonWithSuffixes = ['nidoran']; // Add other Pokémon names as needed

    let curPoke = null;

    // Check for "wild" followed by a Pokémon name or merged "wildpokemon"
    for (let i = 0; i < words.length; i++) {
        if (words[i] === 'wild' && i < words.length - 1) {
            // Case with "wild" followed by a separate Pokémon name
            curPoke = words[i + 1];
        } else if (words[i].startsWith('wild') && words[i].length > 4) {
            // Case with merged "wildpokemon" (e.g., "wildStarly")
            curPoke = words[i].substring(4);
        }

        // If curPoke is identified, check for suffix immediately
        if (curPoke && knownPokemonWithSuffixes.includes(curPoke) && i + 2 < words.length) {
            const potentialSuffix = words[i + 2];
            if (suffixes.includes(potentialSuffix)) {
                curPoke = `${curPoke}-${potentialSuffix}`;
            }
        }

        if (curPoke) {
            console.log('Encounter found:', curPoke);
            return { valid: true, curPoke };
        }
    }

    return { valid: false, curPoke: null };
};

module.exports = checkValidEncounter;
