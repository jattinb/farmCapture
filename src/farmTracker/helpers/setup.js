const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');
const OCR = require('./OCRSession')

async function setup() {
    const OCRforSetUp = new OCR();

    try {
        await OCRforSetUp.initializeWorker();

        const displays = await screenshot.listDisplays();
        const screens = await screenshot.all({ format: 'png' });

        const results = await Promise.all(screens.map((screen, i) => processScreen(screen, displays[i].id, OCRforSetUp)));

        const result = results.find(r => r.status);

        return result || { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'No successful result' };
    } catch (error) {
        console.error('Error during setup:', error);
        return { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 }, error: error.message };
    } finally {
        await OCRforSetUp.terminateWorker();
    }
}

async function processScreen(screen, displayId, OCRforSetUp) {
    try {
        const filteredBuffer = await filterImage(screen);

        const { data: goldData } = await OCRforSetUp.recognizeTextSetupNoWindow(filteredBuffer, 'eng'); // Adjust rectangle if needed

        if (!goldData || !goldData.text) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'OCR failed or no text recognized' };
        }
        // console.log("From filtered", goldData.text);
        const vsCoordinates = findVSCoordinates(goldData.words);
        // console.log(vsCoordinates)
        if (!vsCoordinates) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: '"VS." not found' };
        }

        const { data: colorData } = await OCRforSetUp.recognizeTextSetup(screen, vsCoordinates); // Adjust rectangle if needed

        if (!colorData || !colorData.text) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'OCR failed or no text recognized in color screenshot' };
        }
        // console.log(colorData.text)
        const { pokemonName, bottomRight } = findPokemonLine(colorData.text, colorData.words);

        if (!pokemonName || !bottomRight) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: '"WILD <pokemon_name>" not found or bottom right point missing' };
        }

        const finalBox = {
            x: vsCoordinates.x,
            y: vsCoordinates.y,
            w: bottomRight.x - vsCoordinates.x,
            h: bottomRight.y - vsCoordinates.y
        };
        console.log(finalBox);
        return {
            status: true,
            window: finalBox,
            displayId,
            error: null
        };
    } catch (error) {
        console.error(`Error processing screen ${displayId}:`, error);
        return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: error.message };
    }
}

async function filterImage(inputBuffer) {
    const image = await Jimp.read(inputBuffer);

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];

        // Convert RGB to HSV
        const { h, s, v } = rgbToHsv(red, green, blue);

        // Define the range for yellow and gold color in HSV
        const isYellowGold = (h >= 20 && h <= 60) && (s >= 0.4) && (v >= 0.4);

        // Define the range for black and shadows in HSV (shadows have low value)
        const isBlackOrShadow = v <= 0.4;

        // If not yellow/gold or black/shadow, set pixel to white (or any background color)
        if (!isYellowGold || isBlackOrShadow) {
            this.bitmap.data[idx + 0] = 255; // Red
            this.bitmap.data[idx + 1] = 255; // Green
            this.bitmap.data[idx + 2] = 255; // Blue
        }
    });

    const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return outputBuffer;
}

function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s, v: v };
}

function findVSCoordinates(wordData) {
    for (let i = 0; i < wordData.length; i++) {
        // console.log(wordData[i].text)
        const word = wordData[i].text.toLowerCase();
        if (word === 'vs.' || word === 'vs') {
            const bbox = wordData[i].bbox;
            console.log("Break here", word)
            return { x: bbox.x0, y: bbox.y0, w: 500, h: 100 };
        }
    }
    return null;
}

function findPokemonLine(text, wordData) {
    const lines = text.split('\n');
    let pokemonName = '';
    let bottomRight = null;

    // Iterate through lines to find the line with "WILD"
    for (let line of lines) {
        const upperLine = line.toUpperCase();
        if (upperLine.includes('WILD')) {
            // Grab everything after "WILD" as the Pokémon name
            pokemonName = line.slice(line.toUpperCase().indexOf('WILD') + 5).trim();

            // Find the bounding box of the last word in the Pokémon name
            const nameParts = pokemonName.toUpperCase().split(' ');
            const lastWord = nameParts[nameParts.length - 1];
            const wordObj = wordData.find(word => word.text.toUpperCase() === lastWord);

            if (wordObj) {
                bottomRight = { x: wordObj.bbox.x1, y: wordObj.bbox.y1 };
            }
            break;
        }
    }

    return { pokemonName, bottomRight };
}


module.exports = setup;
