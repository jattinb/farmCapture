const { createWorker } = require('tesseract.js');

class OCRSession {
    constructor() {
        this.worker = null;
    }

    async initializeWorker() {
        this.worker = await createWorker('eng');
    }

    async terminateWorker() {
        if (this.worker && this.worker.terminate) {
            await this.worker.terminate();
            console.log('Hunting Session Ended');
        }
        this.worker = null;
    }

    async recognizeText(imageBuffer, window) {
        try {
            const { x, y, w, h } = window;

            // Perform OCR using Tesseract.js with specified rectangle
            const { data: { text, confidence } } = await this.worker.recognize(imageBuffer, {
                rectangle: { top: y, left: x, width: w, height: h }
            });
            const result = await this.worker.recognize(imageBuffer, {
                rectangle: { top: y, left: x, width: w, height: h }
            });
            if (!text) {
                throw new Error('OCR failed or no text recognized');
            }

            return { text, confidence };
        } catch (error) {
            throw new Error(`Error recognizing OCR: ${error.message}`);
        }
    }

    async recognizeTextSetupNoWindow(imageBuffer) {
        try {
            // Perform OCR using Tesseract.js without specifying a rectangle
            const result = await this.worker.recognize(imageBuffer);

            // Return the entire result object 
            return result;
        } catch (error) {
            throw new Error(`Error recognizing text: ${error.message}`);
        }
    }

    async recognizeTextSetup(imageBuffer, window) {
        try {
            const { x, y, w, h } = window;

            // Perform OCR using Tesseract.js without specifying a rectangle
            const result = await this.worker.recognize(imageBuffer, {
                rectangle: { top: y, left: x, width: w, height: h }
            });

            // Return the entire result object
            return result;
        } catch (error) {
            throw new Error(`Error recognizing text: ${error.message}`);
        }
    }
}

module.exports = OCRSession