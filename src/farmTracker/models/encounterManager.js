const { findPokemon } = require("../helpers/pokemonSearch");

class EncounterManager {
    constructor(pokemonDataManager, pokemonListManager) {
        this.pokemonDataManager = pokemonDataManager;
        this.pokemonListManager = pokemonListManager;
    }

    handleNoEncounter() {
        console.log("No encounter");
        this.pokemonDataManager.updateData({
            isLastScreenEncounter: false,
        });
    }

    async handleEncounter(curPoke) {
        let validPoke = curPoke;

        // Check if it's a new encounter or repeat of the last one
        const currentData = this.pokemonDataManager.getData();

        if (!currentData.pokemonCounts[curPoke]) {
            // Check if the Pokémon exists in the Pokémon list
            const isValidInSet = await this.pokemonListManager.isPokemonInSet(curPoke);
            validPoke = isValidInSet ? curPoke : findPokemon(curPoke);

            if (validPoke === "No match found") {
                console.log("No Match Found");
                return;
            }
        }

        // Avoid counting the same encounter multiple times
        if (currentData.isLastScreenEncounter && currentData.currPoke === validPoke) {
            console.log("Same encounter, not counting");
            return;
        }

        // Update counts and the current encounter
        const updatedCounts = {
            ...currentData.pokemonCounts,
            [validPoke]: (currentData.pokemonCounts[validPoke] || 0) + 1,
        };

        this.pokemonDataManager.updateData({
            pokemonCounts: updatedCounts,
            currPoke: validPoke,
            wildCount: currentData.wildCount + 1,
            isLastScreenEncounter: true,
        });

        console.log(`Detected new "wild ${validPoke}" encounter.`);
        console.log(`Total encounters: ${currentData.wildCount + 1}`);
        console.log("Pokemon counts:", updatedCounts);
    }
}

module.exports = EncounterManager;
