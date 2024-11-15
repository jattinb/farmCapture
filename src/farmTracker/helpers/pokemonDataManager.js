class PokemonDataManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.wildCount = 0;
        this.pokemonCounts = {};
        this.isLastScreenEncounter = false;
        this.currPoke = null;
    }

    loadState(pokemonCounts = {}, wildCount = 0) {
        this.wildCount = wildCount;
        this.pokemonCounts = pokemonCounts;
    }

    getPokemonCounts() {
        return this.pokemonCounts;
    }

    getWildCount() {
        return this.wildCount;
    }

    getLastScreenEncounter() {
        return this.isLastScreenEncounter;
    }

    getCurrPoke() {
        return this.currPoke;
    }

    setPokemonCounts(pokemonCounts) {
        this.pokemonCounts = pokemonCounts;
    }

    setWildCount(wildCount) {
        this.wildCount = wildCount;
    }

    setLastScreenEncounter(isLastScreenEncounter) {
        this.isLastScreenEncounter = isLastScreenEncounter;
    }

    setCurrPoke(currPoke) {
        this.currPoke = currPoke;
    }
}

module.exports = PokemonDataManager;
