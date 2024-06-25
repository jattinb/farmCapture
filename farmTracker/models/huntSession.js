const EventEmitter = require('events');
const captureWindow = require("../helpers/captureWindow");
const recognizeText = require("../helpers/recognizeText");
const checkValidEncounter = require("../helpers/checkValidEncounter");

class HuntSession extends EventEmitter {
    constructor(huntingWindow, huntingDisplayId) {
        super();
        this.currPoke = null;
        this.wildCount = 0;
        this.isLastScreenEncounter = false;
        this.pokemonCounts = {};
        this.huntingWindow = huntingWindow;
        this.huntingDisplayId = huntingDisplayId;
        this.huntingWindow.x -= 50;
        this.huntingWindow.y -= 50;
        this.huntingWindow.w += 60;
        this.huntingWindow.h += 50;

        // Timer-related variables
        this.timer = null;
        this.startTime = 0;
        this.elapsedTime = 0;
    }

    async captureAndRecognize() {
        try {
            const imageBuffer = await captureWindow(this.huntingWindow, this.huntingDisplayId);
            const result = await recognizeText(imageBuffer);

            const { valid, curPoke } = checkValidEncounter(result);

            if (!valid) {
                console.log('No encounter');
                this.isLastScreenEncounter = false;
                this.emit('noEncounter', {
                    currPoke: null,
                    wildCount: this.wildCount,
                    pokemonCounts: this.pokemonCounts,
                });
                return;
            }

            if (!curPoke) {
                console.log('Cannot detect Pokémon encountered');
                return;
            }

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

            console.log(`Detected new "wild ${curPoke}" encounter.`);
            console.log(`Total encounters: ${this.wildCount}`);
            console.log('Pokemon counts:');
            console.log(this.pokemonCounts);

            this.isLastScreenEncounter = true;

            // Emit the newEncounter event with data
            this.emit('newEncounter', {
                currPoke: this.currPoke,
                wildCount: this.wildCount,
                pokemonCounts: this.pokemonCounts,
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    startCaptureInterval(interval = 3000) {
        console.log("Hunting Session Started");
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);

        this.startTimer();
    }

    stopCaptureInterval() {
        console.log("Hunting Session Ended");
        clearInterval(this.intervalID);
        this.stopTimer();
        console.log('\nExiting...');
        this.emit('stop'); // Emit a stop event if needed
    }

    startTimer() {
        this.startTime = Date.now() - this.elapsedTime;
        this.timer = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            const timeString = this.formatTime(this.elapsedTime);
            this.emit('update-timer', timeString);
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timer);
    }

    resetTimer() {
        this.stopTimer();
        this.elapsedTime = 0;
        this.emit('update-timer', this.formatTime(this.elapsedTime));
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
}

module.exports = HuntSession;
