// setup.js

const screenshot = require('screenshot-desktop');
const Tesseract = require('tesseract.js');

async function setup() {
    try {
        // Capture screenshots from all screens and get display information
        const displays = await screenshot.listDisplays();
        const screens = await screenshot.all({ format: 'png' });

        // Process all screens in parallel using async/await with Promise.all
        const results = await Promise.all(screens.map(async (screen, i) => await processScreen(screen, displays[i].id)));

        // Find the first successful result
        const result = results.find(r => r.status);

        // Return the result, or a default if none are successful
        return result || { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 } };
    } catch (error) {
        console.error('Error during setup:', error);
        return { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 } };
    }
}

async function processScreen(screen, displayId) {
    try {
        // Perform OCR on the screenshot
        const { data } = await Tesseract.recognize(screen, 'eng');

        if (!data || !data.text) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 } }; // Skip if OCR failed or no text recognized
        }

        // Parse OCR result to find "VS. Wild <pokemon_name>" line
        const { vsLineIndex, pokemonName } = findPokemonLine(data.text);

        if (vsLineIndex === -1 || !pokemonName) {
            console.log("VS. not found on page");
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 } }; // Skip if "VS. Wild <pokemon_name>" not found
        }

        // Get the coordinates of the "VS." word and the Pokémon name
        const { vsCoordinates, pokemonCoordinates } = findCoordinates(data.words, 'VS.', pokemonName);

        if (!vsCoordinates || !pokemonCoordinates) {
            return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 } }; // Skip if unable to find coordinates
        }

        // Calculate dimensions for cropping
        const { cropX, cropY, cropWidth, cropHeight } = calculateCropDimensions(vsCoordinates, pokemonCoordinates);

        return {
            status: true,
            window: { x: cropX, y: cropY, w: cropWidth, h: cropHeight },
            displayId
        };
    } catch (error) {
        console.error(`Error processing screen ${displayId}:`, error);
        return { status: false, displayId, window: { x: 0, y: 0, w: 0, h: 0 } };
    }
}

// Helper function to find "VS. Wild <pokemon_name>" line in OCR text
function findPokemonLine(text) {
    const lines = text.split('\n');
    let vsLineIndex = -1;
    let pokemonName = '';

    for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes('VS.')) {
            const words = lines[j].split(' ');
            const vsIndex = words.indexOf('VS.');
            if (vsIndex !== -1 && words[vsIndex + 1] === 'Wild') {
                vsLineIndex = j;
                pokemonName = words.slice(vsIndex + 2).join(' ');
                break;
            }
        }
    }

    return { vsLineIndex, pokemonName };
}

// Helper function to find coordinates of "VS." and Pokémon name in OCR word data
function findCoordinates(wordData, vsWord, pokemonName) {
    let vsCoordinates = null;
    let pokemonCoordinates = null;

    for (let i = 0; i < wordData.length; i++) {
        const word = wordData[i];
        if (word.text === vsWord && i + 2 < wordData.length && wordData[i + 2].text === pokemonName) {
            vsCoordinates = { x: word.bbox.x0, y: word.bbox.y0 };
            pokemonCoordinates = { x: wordData[i + 2].bbox.x1, y: wordData[i + 2].bbox.y1 };
            break; // Exit loop once the coordinates are found
        }
    }
    return { vsCoordinates, pokemonCoordinates };
}

// Helper function to calculate dimensions for cropping
function calculateCropDimensions(vsCoordinates, pokemonCoordinates) {
    const cropX = vsCoordinates.x;
    const cropY = vsCoordinates.y;
    const cropWidth = pokemonCoordinates.x - vsCoordinates.x;
    const cropHeight = pokemonCoordinates.y - vsCoordinates.y;

    return { cropX, cropY, cropWidth, cropHeight };
}

module.exports = setup;
