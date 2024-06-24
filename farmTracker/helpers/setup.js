const screenshot = require('screenshot-desktop');
const TesseractSharder = require('tesseract-sharder');
const Jimp = require('jimp');
const path = require('path');

const shard = new TesseractSharder();

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
            const data = await shard.recognize(screen);
            if (!data || !data.text) {
                continue; // Skip this screen if OCR failed or no text recognized
            }

            // Parse OCR result to find "VS. Wild <pokemon_name>" line
            const lines = data.text.split('\n');
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

            if (vsLineIndex === -1 || pokemonName === '') {
                continue; // Skip this screen if "VS. Wild <pokemon_name>" not found
            }

            // Get the coordinates of the "VS." word and the Pokémon name
            const vsWord = 'VS.';
            const pokemonWords = pokemonName.split(' ');

            const wordData = data.words; // Assuming data.words contains OCR word data

            let vsCoordinates = null;
            let pokemonCoordinates = null;

            // Find coordinates based on OCR word data
            for (const word of wordData) {
                if (word.text === vsWord && !vsCoordinates) {
                    vsCoordinates = {
                        x: word.bbox.x0,
                        y: word.bbox.y0,
                    };
                }

                if (pokemonWords.includes(word.text) && !pokemonCoordinates) {
                    pokemonCoordinates = {
                        x: word.bbox.x1,
                        y: word.bbox.y1,
                    };
                }

                if (vsCoordinates && pokemonCoordinates) {
                    break;
                }
            }

            if (!vsCoordinates || !pokemonCoordinates) {
                continue; // Skip this screen if unable to find coordinates for "VS." or Pokémon name
            }

            // Calculate dimensions for cropping
            const cropX = vsCoordinates.x;
            const cropY = vsCoordinates.y;
            const cropWidth = pokemonCoordinates.x - vsCoordinates.x;
            const cropHeight = pokemonCoordinates.y - vsCoordinates.y;

            // Load the screenshot into Jimp (if cropping is needed)
            // const image = await Jimp.read(screen);
            // const croppedImage = image.crop(cropX, cropY, cropWidth, cropHeight);
            // const croppedImagePath = path.join(__dirname, 'cropped_image.png');
            // await croppedImage.writeAsync(croppedImagePath);

            const result = {
                status: true,
                window: {
                    x: cropX,
                    y: cropY,
                    w: cropWidth,
                    h: cropHeight,
                },
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

module.exports = setup;
