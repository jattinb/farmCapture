const fs = require('fs');
const { parse } = require('json2csv');
const { formatTime, parseTimeToMilliseconds } = require('../helpers/formatTime');

class FileManager {
    constructor(pokemonDataManager) {
        this.pokemonDataManager = pokemonDataManager;
        this.fileName = null; // Initialized but will be set during import
    }

    // Export session data to CSV
    exportSessionToCSV(timer, filename = 'default_session.csv') {
        // Use the provided filename or fallback to the class's filename
        const filePath = filename || this.fileName || 'default_session.csv';

        const fields = ['pokemon', 'count', 'time', 'totalCount'];
        const csvData = [];

        const pokemonCounts = this.pokemonDataManager.dataState.pokemonCounts;

        Object.entries(pokemonCounts).forEach(([pokemon, count]) => {
            csvData.push({ pokemon, count });
        });

        if (csvData.length > 0) {
            csvData[0].time = formatTime(timer.elapsedTime);
            csvData[0].totalCount = this.pokemonDataManager.dataState.wildCount;
        }

        const csv = parse(csvData, { fields });

        try {
            fs.writeFileSync(filePath, csv);
            console.log(`Session data exported to CSV: ${filePath}`);
        } catch (err) {
            console.error('Error exporting session to CSV:', err);
        }
    }

    // Import session data from CSV
    importSessionFromCSV(data, timer) {
        if (!data || data.length === 0) {
            console.log('No data to import.');
            return;
        }

        // Save the filename during import (using the data's filename or any default rule you need)
        this.fileName = data[0].fileName || 'default_filename.csv'; // Adjust as needed to get filename from data

        // Reset the session state
        this.pokemonDataManager.reset();

        if (data[0].time) {
            timer.loadTime(parseTimeToMilliseconds(data[0].time));
        }

        data.forEach(row => {
            const { pokemon, count } = row;
            const currentPokemonCounts = { ...this.pokemonDataManager.dataState.pokemonCounts };
            currentPokemonCounts[pokemon] = parseInt(count, 10);

            const newWildCount = this.pokemonDataManager.dataState.wildCount + parseInt(count, 10);
            this.pokemonDataManager.dataState = { pokemonCounts: currentPokemonCounts, wildCount: newWildCount };
        });

        console.log('Session data imported and counts updated.');
    }
}

module.exports = FileManager;
