const path = require('path');
const EventEmitter = require('events');

// const captureWindowPath = path.join(__dirname, '..', 'helpers', 'captureWindow');
// const OCRSessionPath = path.join(__dirname, '..', 'helpers', 'OCRSession');
// const checkValidEncounterPath = path.join(__dirname, '..', 'helpers', 'checkValidEncounter');
// const timerPath = path.join(__dirname, 'timer');
// const formatTimePath = path.join(__dirname, '..', 'helpers', 'formatTime');

// const captureWindow = require(captureWindowPath);
// const OCRSession = require(OCRSessionPath);
// const checkValidEncounter = require(checkValidEncounterPath);
// const { formatTime, parseTimeToMilliseconds } = require(formatTimePath);
// const Timer = require(timerPath);
const fs = require('fs');
const { parse } = require('json2csv');
const { formatTime, parseTimeToMilliseconds } = require('./../helpers/formatTime');
const captureWindow = require('./../helpers/captureWindow');
const OCRSession = require('./../helpers/OCRSession');
const checkValidEncounter = require('./../helpers/checkValidEncounter');
const Timer = require('./../models/timer');
const { isPokemonInSet } = require('./../helpers/pokemonList');
const { findPokemon } = require('../helpers/pokemonSearch');
const HuntingWindowManager = require('../helpers/huntingWindowManager');
const PokemonDataManager = require('../helpers/pokemonDataManager'); // Import PokemonDataManager

class HuntSession extends EventEmitter {
    constructor() {
        super();

        if (HuntSession.instance) {
            return HuntSession.instance;
        }

        this.huntingWindowManager = new HuntingWindowManager();
        this.pokemonDataManager = new PokemonDataManager(); // Initialize PokemonDataManager
        this.pokemonList = null
        this.pokemonSet = null
        this.timer = Timer.getInstance();
        this.intervalID = null;

        this.fileName = null;

        this.ocrSession = new OCRSession();

        // Bind timer events
        this.timer.on('update-timer', (timeString) => this.emit('update-timer', timeString));

        HuntSession.instance = this;
    }

    setUpWindow(window, displayId) {
        this.huntingWindowManager.setWindowAndDisplayId(window, displayId);
    }

    loadState(pokemonCounts = {}, wildCount = 0, timeStr = '00:00:00') {
        this.pokemonDataManager.loadState(pokemonCounts, wildCount); // Delegate to PokemonDataManager
        if (timeStr === '00:00:00') {
            this.timer.reset();
        } else {
            this.timer.loadTime(parseTimeToMilliseconds(timeStr));
        }
    }

    async captureAndRecognize() {
        try {
            const imageBuffer = await captureWindow(this.huntingWindowManager.getDisplayId());

            // Perform OCR recognition on the captured image
            const { text, confidence } = await this.ocrSession.recognizeText(imageBuffer, this.huntingWindowManager.getWindow());
            console.log(text, confidence);
            // console.log(text, confidence)
            // Handle low-confidence OCR results
            if (confidence < 45) {
                this.handleNoEncounter();
                return;
            }

            // Check if the OCR result contains a valid encounter
            const { valid, curPoke } = checkValidEncounter(text);

            if (!valid) {
                this.handleNoEncounter();
                return;
            }

            // Ensure that a Pokémon was detected
            if (!curPoke) {
                console.log('Cannot detect Pokémon encountered');
                return;
            }

            // Handle the detected Pokémon encounter
            this.handleEncounter(curPoke);

        } catch (error) {
            console.error('Error during capture and recognition:', error);
            this.handleNoEncounter();
            // Handle specific OCR worker error
            if (error.message === 'OCR worker is not initialized or has been terminated.') {
                console.log('Recognition was attempted after the worker was terminated.');
            }
        }
    }

    handleNoEncounter() {
        console.log('No encounter');
        this.pokemonDataManager.setLastScreenEncounter(false); // Use PokemonDataManager to handle state
        this.emit('noEncounter');
    }

    handleEncounter(curPoke) {
        let validPoke = curPoke;

        if (!this.pokemonDataManager.getPokemonCounts()[curPoke]) {
            validPoke = isPokemonInSet(curPoke, this.pokemonSet) ? curPoke : findPokemon(curPoke, this.pokemonList);
            if (validPoke === 'No match found') {
                console.log('No Match Found');
                return;
            }
        }

        if (this.pokemonDataManager.getLastScreenEncounter() && this.pokemonDataManager.getCurrPoke() === validPoke) {
            console.log('Same encounter, not counting');
            return;
        }

        this.pokemonDataManager.setPokemonCounts({ ...this.pokemonDataManager.getPokemonCounts(), [validPoke]: (this.pokemonDataManager.getPokemonCounts()[validPoke] || 0) + 1 });
        this.pokemonDataManager.setCurrPoke(validPoke);
        this.pokemonDataManager.setWildCount(this.pokemonDataManager.getWildCount() + 1);
        this.pokemonDataManager.setLastScreenEncounter(true);

        console.log(`Detected new "wild ${validPoke}" encounter.`);
        console.log(`Total encounters: ${this.pokemonDataManager.getWildCount()}`);
        console.log('Pokemon counts:', this.pokemonDataManager.getPokemonCounts());

        this.emit('newEncounter', {
            currPoke: this.pokemonDataManager.getCurrPoke(),
            wildCount: this.pokemonDataManager.getWildCount(),
            pokemonCounts: this.pokemonDataManager.getPokemonCounts(),
        });
    }

    async startCaptureInterval(interval = 1000) {
        if (this.intervalID) {
            console.log('Capture interval already running');
            return;
        }
        await this.ocrSession.initializeWorker();
        console.log('Hunting Session Started');
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);
        this.timer.start();
    }

    async stopCaptureInterval() {
        if (!this.intervalID) {
            console.log('No capture interval to stop');
            return;
        }

        clearInterval(this.intervalID);
        this.intervalID = null;
        this.timer.stop();
        this.emit('stop');

        try {
            await this.ocrSession.terminateWorker();
            console.log('Hunting Session Stopped');
        } catch (error) {
            console.error('Error terminating OCR worker:', error.message);
        }
    }

    reset() {
        if (this.intervalID) {
            console.log('Cannot reset while session is running');
            return;
        }

        this.pokemonDataManager.setLastScreenEncounter(false);
        this.pokemonDataManager.setCurrPoke(null);
        this.loadState();
        this.emit('reset-count', {
            currPoke: null,
            wildCount: 0,
            pokemonCounts: {},
        });

        // Reset the singleton instance
        HuntSession.resetInstance();
    }

    // Export session data to CSV
    exportSessionToCSV(filename) {
        const fields = ['pokemon', 'count', 'time', 'totalCount'];
        const csvData = [];

        Object.entries(this.pokemonDataManager.getPokemonCounts()).forEach(([pokemon, count]) => {
            csvData.push({ pokemon, count });
        });

        if (csvData.length > 0) {
            csvData[0].time = formatTime(this.timer.elapsedTime);
            csvData[0].totalCount = this.pokemonDataManager.getWildCount();
        }

        const csv = parse(csvData, { fields });
        const filePath = `${filename}`;

        try {
            fs.writeFileSync(filePath, csv);
            console.log(`Session data exported to CSV: ${filePath}`);
        } catch (err) {
            console.error('Error exporting session to CSV:', err);
        }
    }

    // Import session data from CSV
    importSessionFromCSV(data) {
        this.reset();
        if (data && data[0].time) {
            this.timer.loadTime(parseTimeToMilliseconds(data[0].time));
        }
        data.forEach(row => {
            const { pokemon, count } = row;
            this.pokemonDataManager.getPokemonCounts()[pokemon] = parseInt(count, 10);
            this.pokemonDataManager.setWildCount(this.pokemonDataManager.getWildCount() + parseInt(count, 10));
        });

        this.emit('update-count', {
            currPoke: null,
            wildCount: this.pokemonDataManager.getWildCount(),
            pokemonCounts: this.pokemonDataManager.getPokemonCounts(),
        });
    }

    // Method to check if a hunting session is active
    isActive() {
        return !!this.intervalID;
    }

    static getInstance() {
        if (!HuntSession.instance) {
            console.log('Creating new Hunt Session instance');
            HuntSession.instance = new HuntSession();
        }
        return HuntSession.instance;
    }

    static resetInstance() {
        HuntSession.instance = null;
    }
}

module.exports = HuntSession;
