const screenshot = require('screenshot-desktop');
const TesseractSharder = require('tesseract-sharder');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;

const shard = new TesseractSharder();

// Setup works but only on the primary screen right now, can use screenshot.all() later to extend
async function setup() {
    try {
        // Capture a screenshot and save it to a file
        const imageBuffer = await screenshot({ format: 'png' });

        // Perform OCR on the screenshot
        const data = await shard.recognize(imageBuffer);
        if (!data || !data.text) {
            throw new Error('OCR failed or no text recognized');
        }

        // Parse OCR result to find "VS. Wild <pokemon_name>" line
        const lines = data.text.split('\n');
        let vsLineIndex = -1;
        let pokemonName = '';

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('VS.')) {
                const words = lines[i].split(' ');
                const vsIndex = words.indexOf('VS.');
                if (vsIndex !== -1 && words[vsIndex + 1] === 'Wild') {
                    vsLineIndex = i;
                    pokemonName = words.slice(vsIndex + 2).join(' ');
                    break;
                }
            }
        }

        if (vsLineIndex === -1 || pokemonName === '') {
            throw new Error('Unable to find "VS. Wild <pokemon_name>" in the screenshot.');
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
            throw new Error('Unable to find coordinates for "VS." or Pokémon name.');
        }

        // Calculate dimensions for cropping
        const cropX = vsCoordinates.x;
        const cropY = vsCoordinates.y;
        const cropWidth = pokemonCoordinates.x - vsCoordinates.x;
        const cropHeight = pokemonCoordinates.y - vsCoordinates.y;

        // // Load the screenshot into Jimp
        // const image = await Jimp.read(imageBuffer);

        // // Crop the image based on calculated coordinates
        // const croppedImage = image.crop(cropX, cropY, cropWidth, cropHeight);

        // // Save the cropped image to a file
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
            imagePath: croppedImagePath, // Provide the path to the cropped image
        };

        return result;
    } catch (error) {
        console.error('Error during setup:', error);
        return { status: false, window: { x: 0, y: 0, w: 0, h: 0 } };
    }
}

module.exports = setup;
