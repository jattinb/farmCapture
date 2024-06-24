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
        // this.huntingWindow = {
        //     x: 1000,    // Example x coordinate
        //     y: 515,     // Example y coordinate
        //     width: 700, // Example width
        //     height: 115 // Example height
        // };
        this.huntingWindow = huntingWindow
        this.huntingDisplayId = huntingDisplayId
        this.huntingWindow.x -= 50
        this.huntingWindow.y -= 50
        this.huntingWindow.w += 60
        this.huntingWindow.h += 50
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
                })
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
