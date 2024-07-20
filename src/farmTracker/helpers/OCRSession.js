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
            const { data: { text } } = await this.worker.recognize(imageBuffer, {
                rectangle: { top: y, left: x, width: w, height: h }
            });

            if (!text) {
                throw new Error('OCR failed or no text recognized');
            }

            return text;
        } catch (error) {
            throw new Error(`Error recognizing OCR: ${error.message}`);
        }
    }
}

module.exports = OCRSession