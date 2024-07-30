const screenshot = require('screenshot-desktop');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

async function setup() {
    try {
        const displays = await screenshot.listDisplays();
        const screens = await screenshot.all({ format: 'png' });

        const results = await Promise.all(screens.map((screen, i) => processScreen(screen, displays[i].id)));

        const result = results.find(r => r.status);

        return result || { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'No successful result' };
    } catch (error) {
        console.error('Error during setup:', error);
        return { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 }, error: error.message };
    }
}

async function processScreen(screen, displayId) {
    try {
        const filteredBuffer = await filterImage(screen);

        const { data: goldData } = await Tesseract.recognize(filteredBuffer, 'eng');

        if (!goldData || !goldData.text) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'OCR failed or no text recognized' };
        }
        // console.log("From filtered", goldData.text);
        const vsCoordinates = findVSCoordinates(goldData.words);

        if (!vsCoordinates) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: '"VS." not found' };
        }

        const { x, y, w, h } = vsCoordinates;
        const coloredImage = await Jimp.read(screen);
        const croppedBuffer = await coloredImage.crop(x, y, w, h).getBufferAsync(Jimp.MIME_PNG);
        const { data: colorData } = await Tesseract.recognize(croppedBuffer, 'eng');

        if (!colorData || !colorData.text) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: 'OCR failed or no text recognized in color screenshot' };
        }
        console.log(colorData.text)
        const { vsLineIndex, pokemonName, bottomRight } = findPokemonLine(colorData.text, colorData.words);

        if (vsLineIndex === -1 || !pokemonName || !bottomRight) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 }, error: '"VS. Wild <pokemon_name>" not found or bottom right point missing' };
        }

        // Calculate the final bounding box
        const finalBox = {
            x: vsCoordinates.x,
            y: vsCoordinates.y,
            w: bottomRight.x,
            h: bottomRight.y
        };
        console.log(finalBox)
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

    // Create a map for quick lookup of word bounding boxes
    const wordMap = wordData.reduce((map, word) => {
        map[word.text.toUpperCase()] = word.bbox;
        return map;
    }, {});

    // Iterate through lines to find the relevant line and Pokémon name
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].toUpperCase();
        if (line.includes('WILD')) {
            const words = line.split(' ');
            const wildIndex = words.indexOf('WILD');
            if (wildIndex !== -1) {
                pokemonName = words.slice(wildIndex + 1).join(' ');

                // Lookup the Pokémon name in the word map
                const bbox = wordMap[pokemonName.toUpperCase()];
                if (bbox) {
                    bottomRight = { x: bbox.x1, y: bbox.y1 };
                }
                break;
            }
        }
    }

    return { pokemonName, bottomRight };
}



module.exports = setup;
