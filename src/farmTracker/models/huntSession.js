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

class HuntSession extends EventEmitter {
    constructor() {
        super();

        if (HuntSession.instance) {
            return HuntSession.instance;
        }

        this.huntingWindow = null;
        this.huntingDisplayId = null;
        this.wildCount = 0;
        this.pokemonCounts = {}; // Structure: { pokemonName: { total: 0, m: 0, d: 0, n: 0 } }
        this.timer = Timer.getInstance();
        this.intervalID = null;
        this.isLastScreenEncounter = false;
        this.currPoke = null;
        this.fileName = null;
        this.ocrSession = new OCRSession();
        this.pokemonList = null;
        this.pokemonSet = null;

        this.timer.on('update-timer', (timeString) => this.emit('update-timer', timeString));

        HuntSession.instance = this;
    }

    setUpWindow(window, displayId) {
        this.huntingWindow = this.adjustHuntingWindow(window);
        this.huntingDisplayId = displayId;
    }

    loadState(pokemonCounts = {}, wildCount = 0, timeStr = '00:00:00') {
        this.wildCount = wildCount;
        this.pokemonCounts = pokemonCounts;
        if (timeStr === '00:00:00') {
            this.timer.reset();
        } else {
            this.timer.loadTime(parseTimeToMilliseconds(timeStr));
        }
    }

    adjustHuntingWindow(huntingWindow) {
        return {
            x: huntingWindow.x - 50,
            y: huntingWindow.y - 50,
            w: huntingWindow.w + 150,
            h: huntingWindow.h + 75,
        };
    }

    async captureAndRecognize() {
        try {
            // Capture the window based on the huntingDisplayId
            const imageBuffer = await captureWindow(this.huntingDisplayId);
            console.log(this.huntingWindow, this.huntingDisplayId);

            // Perform OCR recognition on the captured image
            const { text, confidence } = await this.ocrSession.recognizeText(imageBuffer, this.huntingWindow);
            console.log(text, confidence)
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
            this.handleNoEncounter()
            // Handle specific OCR worker error
            if (error.message === 'OCR worker is not initialized or has been terminated.') {
                console.log('Recognition was attempted after the worker was terminated.');
            }
        }
    }

    handleNoEncounter() {
        console.log('No encounter');
        this.isLastScreenEncounter = false;
        this.emit('noEncounter');
    }

    handleEncounter(curPoke) {
        let validPoke = curPoke;

        // Check if the Pokémon has already been encountered
        if (!this.pokemonCounts[curPoke]) {
            // Validate the Pokémon name if not already in pokemonCounts
            validPoke = isPokemonInSet(curPoke, this.pokemonSet) ? curPoke : findPokemon(curPoke, this.pokemonList);
            if (validPoke === 'No match found') {
                console.log('No Match Found');
                return;
            }
            this.pokemonCounts[validPoke] = { total: 0, m: 0, d: 0, n: 0 };
        }

        // Skip counting if it's the same encounter as the last one
        if (this.isLastScreenEncounter && this.currPoke === validPoke) {
            console.log('Same encounter, not counting');
            return;
        }

        const timeOfDay = this.getTimeOfDay();
        this.pokemonCounts[validPoke][timeOfDay]++;
        this.pokemonCounts[validPoke].total++;
        this.currPoke = validPoke;
        this.wildCount++;
        this.isLastScreenEncounter = true;

        console.log(`Detected new "wild ${validPoke}" encounter.`);
        console.log(`Total encounters: ${this.wildCount}`);
        console.log('Pokemon counts:', this.pokemonCounts);

        this.emit('newEncounter', {
            currPoke: this.currPoke,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
        });
    }

    pokeTime() {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcSeconds = now.getUTCSeconds();

        let secondsPassed = utcHours * 3600 + utcMinutes * 60 + utcSeconds;
        secondsPassed *= 4;

        const adjustedDate = new Date(now.getTime() + secondsPassed * 1000);

        const adjustedHours = adjustedDate.getUTCHours();
        const adjustedMinutes = adjustedDate.getUTCMinutes();

        return `${String(adjustedHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}`;
    }

    getTimeOfDay() {
        const pokeTimeString = this.pokeTime();
        const [hours] = pokeTimeString.split(':').map(Number);

        if (hours >= 4 && hours < 10) return 'm'; // Morning
        if (hours >= 10 && hours < 20) return 'd'; // Daytime
        return 'n'; // Nighttime
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

        this.isLastScreenEncounter = false;
        this.currPoke = null;
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
        const fields = ['pokemon', 'total', 'morning', 'day', 'night', 'time', 'totalCount'];
        const csvData = [];

        Object.entries(this.pokemonCounts).forEach(([pokemon, counts]) => {
            csvData.push({
                pokemon,
                total: counts.total,
                morning: counts.m,
                day: counts.d,
                night: counts.n,
            });
        });

        if (csvData.length > 0) {
            csvData[0].time = formatTime(this.timer.elapsedTime);
            csvData[0].totalCount = this.wildCount;
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
            const { pokemon, total, morning, day, night } = row;
            this.pokemonCounts[pokemon] = {
                total: parseInt(total, 10),
                m: parseInt(morning, 10),
                d: parseInt(day, 10),
                n: parseInt(night, 10),
            };
            this.wildCount += parseInt(total, 10);
        });

        this.emit('update-count', {
            currPoke: null,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
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
