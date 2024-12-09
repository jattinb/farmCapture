class PokemonDataManager {
    constructor() {
        this.data = {
            wildCount: 0,
            pokemonCounts: {},
            isLastScreenEncounter: false,
            currPoke: null,
        };
    }

    // Method to get the current data state
    getData() {
        return this.data;
    }

    // Method to update the data state and emit an event
    updateData(newData) {
        this.data = { ...this.data, ...newData };
    }

    // Method to reset the data to its default state and emit an event
    resetData() {
        this.updateData({
            wildCount: 0,
            pokemonCounts: {},
            isLastScreenEncounter: false,
            currPoke: null,
        });
    }

    // Method to load the state with default or provided values and emit an event
    loadState(pokemonCounts = {}, wildCount = 0) {
        this.updateData({ pokemonCounts, wildCount });
    }
}

module.exports = PokemonDataManager;
