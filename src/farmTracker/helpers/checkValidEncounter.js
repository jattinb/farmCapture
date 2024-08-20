// Function to detect valid encounter using OCR result
const checkValidEncounter = (text) => {
    const words = text.toLowerCase().split(/\W+/);
    const vsIndex = words.indexOf('vs');

    if (vsIndex !== -1 && vsIndex < words.length - 1) {
        const nextWord = words[vsIndex + 1];

        // Check for "wild" followed by the Pokémon name or a merged "wildpokemon"
        if (nextWord === 'wild' && vsIndex + 2 < words.length) {
            console.log('Encounter found:', words[vsIndex + 2]);
            return { valid: true, curPoke: words[vsIndex + 2] };
        } else if (nextWord.startsWith('wild')) {
            const pokemonName = nextWord.substring(4); // Extract the Pokémon name after "wild"
            console.log('Encounter found:', pokemonName);
            return { valid: true, curPoke: pokemonName };
        }
    }

    return { valid: false, curPoke: null };
};

module.exports = checkValidEncounter;
