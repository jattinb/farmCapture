const Tesseract = require('tesseract.js');

// Function to perform OCR using tesseract.js
const recognizeText = async (imageBuffer) => {
    try {
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
            // logger: m => console.log(m) // Optional logger
        });
        if (!text) {
            throw new Error('OCR failed or no text recognized');
        }
        return text;
    } catch (error) {
        throw new Error(`Error recognizing OCR: ${error.message}`);
    }
};

module.exports = recognizeText;
