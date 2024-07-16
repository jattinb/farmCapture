// setup.js

const screenshot = require('screenshot-desktop');
const Tesseract = require('tesseract.js');

async function setup() {
    try {
        // Capture screenshots from all screens and get display information
        const displays = await screenshot.listDisplays();
        const screens = await screenshot.all({ format: 'png' });

        // Iterate through all screens with index
        for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            const displayId = displays[i].id;

            // Perform OCR on the screenshot
            const { data } = await Tesseract.recognize(screen, 'eng', {
                // logger: m => console.log(m) // Optional logger
            });

            if (!data || !data.text) {
                continue; // Skip this screen if OCR failed or no text recognized
            }

            // Parse OCR result to find "VS. Wild <pokemon_name>" line
            const { vsLineIndex, pokemonName } = findPokemonLine(data.text);

            if (vsLineIndex === -1 || pokemonName === '') {
                console.log("VS. not found on page")
                continue; // Skip this screen if "VS. Wild <pokemon_name>" not found
            }

            // Get the coordinates of the "VS." word and the Pokémon name
            const { vsCoordinates, pokemonCoordinates } = findCoordinates(data.words, 'VS.', pokemonName);

            if (!vsCoordinates || !pokemonCoordinates) {
                continue; // Skip this screen if unable to find coordinates for "VS." or Pokémon name
            }

            // Calculate dimensions for cropping
            const { cropX, cropY, cropWidth, cropHeight } = calculateCropDimensions(vsCoordinates, pokemonCoordinates);

            const result = {
                status: true,
                window: { x: cropX, y: cropY, w: cropWidth, h: cropHeight },
                displayId: displayId
            };

            return result; // Return the result for the specific screen
        }

        // If none of the screens contain the desired text
        return { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 } };
    } catch (error) {
        console.error('Error during setup:', error);
        return { status: false, displayId: null, window: { x: 0, y: 0, w: 0, h: 0 } };
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
function findCoordinates(wordData, vsWord) {
    let vsCoordinates = null;
    let pokemonCoordinates = null;

    for (let i = 0; i < wordData.length; i++) {
        const word = wordData[i];

        if (word.text === vsWord && !vsCoordinates) {
            vsCoordinates = { x: word.bbox.x0, y: word.bbox.y0 };

            if (i + 2 < wordData.length) {
                pokemonCoordinates = { x: wordData[i + 2].bbox.x1, y: wordData[i + 2].bbox.y1 };
            }
            else {
                throw Error("Pokemon not found next to VS.")
            }
            break;
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
