const EventEmitter = require('events');
const captureWindow = require("../helpers/captureWindow");
const recognizeText = require("../helpers/recognizeText");
const checkValidEncounter = require("../helpers/checkValidEncounter");

class HuntSession extends EventEmitter {
    constructor() {
        super();
        this.wildCount = 0;
        this.lastWildFollowWord = null;
        this.isLastScreenEncounter = false;
        this.pokemonCounts = {};
    }

    async captureAndRecognize() {
        try {
            const imageBuffer = await captureWindow();
            const result = await recognizeText(imageBuffer);

            const { valid, curPoke } = checkValidEncounter(result);

            if (!valid) {
                console.log('No encounter');
                this.isLastScreenEncounter = false;
                return;
            }

            if (!curPoke) {
                console.log('Cannot detect Pokémon encountered');
                return;
            }

            if (this.isLastScreenEncounter && this.lastWildFollowWord === curPoke) {
                console.log('Same encounter, not counting');
                return;
            }

            if (this.pokemonCounts[curPoke]) {
                this.pokemonCounts[curPoke]++;
            } else {
                this.pokemonCounts[curPoke] = 1;
            }

            this.lastWildFollowWord = curPoke;
            this.wildCount++;

            console.log(`Detected new "wild ${curPoke}" encounter.`);
            console.log(`Total encounters: ${this.wildCount}`);
            console.log('Pokemon counts:');
            console.log(this.pokemonCounts);

            this.isLastScreenEncounter = true;

            // Emit the newEncounter event with data
            this.emit('newEncounter', {
                wildCount: this.wildCount,
                pokemonCounts: this.pokemonCounts,
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }

    startCaptureInterval(interval) {
        console.log("Hunting Session Started")
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);
    }

    stopCaptureInterval() {
        console.log("Hunting Session Ended")
        clearInterval(this.intervalID);
        console.log('\nExiting...');
        this.emit('stop'); // Emit a stop event if needed
    }
}

module.exports = HuntSession;
