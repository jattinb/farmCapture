// farmTracker/models/HuntSession.js

const EventEmitter = require('events');
const captureWindow = require("../helpers/captureWindow");
const recognizeText = require("../helpers/recognizeText");
const checkValidEncounter = require("../helpers/checkValidEncounter");
const Timer = require("./timer");

class HuntSession extends EventEmitter {
    constructor(huntingWindow, huntingDisplayId) {
        super();
        this.huntingWindow = this.adjustHuntingWindow(huntingWindow);
        this.huntingDisplayId = huntingDisplayId;
        this.isLastScreenEncounter = false;
        this.currPoke = null;
        this.wildCount = 0;
        this.pokemonCounts = {};
        this.timer = new Timer();

        // Bind timer events
        this.timer.on('update-timer', (timeString) => this.emit('update-timer', timeString));
    }

    adjustHuntingWindow(huntingWindow) {
        return {
            x: huntingWindow.x - 50,
            y: huntingWindow.y - 50,
            w: huntingWindow.w + 75,
            h: huntingWindow.h + 50,
        };
    }

    async captureAndRecognize() {
        try {
            const imageBuffer = await captureWindow(this.huntingWindow, this.huntingDisplayId);
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
        console.log("Hunting Session Started");
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);
        this.timer.start();
    }

    stopCaptureInterval() {
        console.log("Hunting Session Ended");
        clearInterval(this.intervalID);
        this.timer.stop();
        console.log('\nExiting...');
        this.emit('stop');
    }

    reset() {
        this.wildCount = 0;
        this.pokemonCounts = {};
        this.currPoke = null;
        this.isLastScreenEncounter = false;
        this.timer.reset();
        this.emit('reset');
        this.emit('update-count', {
            currPoke: null,
            wildCount: this.wildCount,
            pokemonCounts: this.pokemonCounts,
        });
    }
}

module.exports = HuntSession;
