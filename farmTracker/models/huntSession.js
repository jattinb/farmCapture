const EventEmitter = require('events');
const captureWindow = require("../helpers/captureWindow");
const recognizeText = require("../helpers/recognizeText");
const checkValidEncounter = require("../helpers/checkValidEncounter");
const Timer = require("./timer");
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');
const { formatTime, parseTimeToMilliseconds } = require('../helpers/formatTime');

class HuntSession extends EventEmitter {
    constructor() {
        super(); // Must call super() before accessing 'this'

        if (HuntSession.instance) {
            return HuntSession.instance;
        }

        this.huntingWindow = null;
        this.huntingDisplayId = null;
        this.wildCount = 0;
        this.pokemonCounts = {};
        this.timer = Timer.getInstance();
        this.intervalID = null;
        this.isLastScreenEncounter = false;
        this.currPoke = null;
        this.fileName = null;
        // Bind timer events
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
            w: huntingWindow.w + 100,
            h: huntingWindow.h + 75,
        };
    }

    async captureAndRecognize() {
        try {
            const imageBuffer = await captureWindow(this.huntingWindow, this.huntingDisplayId);
            console.log(this.huntingWindow, this.huntingDisplayId)
            const result = await recognizeText(imageBuffer);
            const { valid, curPoke } = checkValidEncounter(result);

            if (!valid) {
                this.handleNoEncounter();
                return;
            }

            if (!curPoke) {
                console.log('Cannot detect Pokémon encountered');
                return;
            }

            this.handleEncounter(curPoke);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    handleNoEncounter() {
        console.log('No encounter');
        this.isLastScreenEncounter = false;
        this.emit('noEncounter', {
            currPoke: null,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
        });
    }

    handleEncounter(curPoke) {
        if (this.isLastScreenEncounter && this.currPoke === curPoke) {
            console.log('Same encounter, not counting');
            return;
        }

        if (this.pokemonCounts[curPoke]) {
            this.pokemonCounts[curPoke]++;
        } else {
            this.pokemonCounts[curPoke] = 1;
        }

        this.currPoke = curPoke;
        this.wildCount++;
        this.isLastScreenEncounter = true;

        console.log(`Detected new "wild ${curPoke}" encounter.`);
        console.log(`Total encounters: ${this.wildCount}`);
        console.log('Pokemon counts:', this.pokemonCounts);

        this.emit('newEncounter', {
            currPoke: this.currPoke,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
        });
    }

    startCaptureInterval(interval = 2000) {
        if (this.intervalID) {
            console.log("Capture interval already running");
            return;
        }

        console.log("Hunting Session Started");
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);
        this.timer.start();
    }

    stopCaptureInterval() {
        if (!this.intervalID) {
            console.log("No capture interval to stop");
            return;
        }

        console.log("Hunting Session Ended");
        clearInterval(this.intervalID);
        this.intervalID = null;
        this.timer.stop();
        console.log('\nExiting...');
        this.emit('stop');
    }

    reset() {
        if (this.intervalID) {
            console.log("Cannot reset while session is running");
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
        const fields = ['pokemon', 'count', 'time', 'totalCount'];
        const csvData = [];

        // Convert pokemonCounts object to array of { pokemon, count } objects
        Object.entries(this.pokemonCounts).forEach(([pokemon, count]) => {
            csvData.push({ pokemon, count });
        });

        // Include time and totalCount for the session only in the first row
        if (csvData.length > 0) {
            csvData[0].time = formatTime(this.timer.elapsedTime);
            csvData[0].totalCount = this.wildCount;
        }

        const csv = parse(csvData, { fields });
        const filePath = `${filename}`; // Construct the file path with the chosen filename

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
            this.timer.loadTime(parseTimeToMilliseconds(data[0].time))
        }
        data.forEach(row => {
            const { pokemon, count } = row;
            this.pokemonCounts[pokemon] = parseInt(count, 10);
            this.wildCount += parseInt(count, 10);
        });
        console.log('Here update-count not yet emitted in huntSession')

        this.emit('update-count', {
            currPoke: null,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
        });
        console.log('Here update-count emited in huntSession')
    }

    // Method to check if a hunting session is active
    isActive() {
        return !!this.intervalID;
    }

    static getInstance() {
        if (!HuntSession.instance) {
            console.log("Creating new Hunt Session instance");
            HuntSession.instance = new HuntSession();
        }
        return HuntSession.instance;
    }

    static resetInstance() {
        HuntSession.instance = null;
    }
}

module.exports = HuntSession;
