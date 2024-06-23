const TesseractSharder = require('tesseract-sharder');

const shard = new TesseractSharder();

// Function to perform OCR using TesseractSharder
const recognizeText = async (imageBuffer) => {
    try {
        const data = await shard.recognize(imageBuffer);
        if (!data || !data.text) {
            throw new Error('OCR failed or no text recognized');
        }
        return data.text;
    } catch (error) {
        throw new Error(`Error recognizing OCR: ${error.message}`);
    }
};

module.exports = recognizeText