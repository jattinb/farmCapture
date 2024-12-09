const captureAndRecognize = require('./../helpers/captureAndRecognize');

class CaptureManager {
    constructor(huntingWindowManager, ocrSession) {
        this.huntingWindowManager = huntingWindowManager;
        this.ocrSession = ocrSession;

        this.intervalID = null;
    }

    async startCaptureInterval(interval = 1000) {
        if (this.intervalID) {
            console.log('Capture interval already running');
            return;
        }
        await this.ocrSession.initializeWorker();
        console.log('Capture Interval Started');
        this.intervalID = setInterval(() => {
            this.captureAndRecognize();
        }, interval);
    }

    async stopCaptureInterval() {
        if (!this.intervalID) {
            console.log('No capture interval to stop');
            return;
        }

        clearInterval(this.intervalID);
        this.intervalID = null;
        console.log('Capture Interval Stopped');

        try {
            await this.ocrSession.terminateWorker();
        } catch (error) {
            console.error('Error terminating OCR worker:', error.message);
        }
    }

    async captureAndRecognize() {
        const result = await captureAndRecognize(this.huntingWindowManager, this.ocrSession);

        return result;
    }
}

module.exports = CaptureManager;
