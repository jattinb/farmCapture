const { createWorker } = require('tesseract.js');

class OCRforSetUp {
    constructor() {
        this.worker = null;
    }

    async initializeWorker() {
        this.worker = await createWorker();
    }

    async terminateWorker() {
        if (this.worker && this.worker.terminate) {
            await this.worker.terminate();
            console.log('OCR Session Ended');
        }
        this.worker = null;
    }

    async recognizeText(imageBuffer) {
        try {
            // Perform OCR using Tesseract.js without specifying a rectangle
            const result = await this.worker.recognize(imageBuffer);

            // Return the entire result object
            return result;
        } catch (error) {
            throw new Error(`Error recognizing text: ${error.message}`);
        }
    }
}

module.exports = OCRforSetUp;
