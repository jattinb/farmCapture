// captureHelper.js
const captureWindow = require('./captureWindow');
const OCRSession = require('./../models/OCRSession');
const checkValidEncounter = require('./checkValidEncounter');

async function captureAndRecognize(huntingWindowManager, ocrSession) {
    try {
        const imageBuffer = await captureWindow(huntingWindowManager.data.displayId);

        // Perform OCR recognition on the captured image
        const { text, confidence } = await ocrSession.recognizeText(imageBuffer, huntingWindowManager.data.window);
        console.log(text, confidence);

        // Handle low-confidence OCR results
        if (confidence < 45) {
            return { success: false, reason: 'Low confidence' };
        }

        // Check if the OCR result contains a valid encounter
        const { valid, curPoke } = checkValidEncounter(text);

        if (!valid) {
            return { success: false, reason: 'Invalid encounter' };
        }

        // Ensure that a Pokémon was detected
        if (!curPoke) {
            return { success: false, reason: 'No Pokémon detected' };
        }

        return { success: true, curPoke };
    } catch (error) {
        console.error('Error during capture and recognition:', error);
        return { success: false, reason: error.message };
    }
}

module.exports = captureAndRecognize;
