const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');

// Function to capture the window using screenshot-desktop
const captureWindow = async (window, displayId) => {
    try {
        // Capture the screenshot of the specific screen
        const imgBuffer = await screenshot({ screen: displayId, format: 'png' });

        // Use Jimp to read the image buffer
        const image = await Jimp.read(imgBuffer);

        // Assuming 'window' is an object with properties x, y, width, and height
        const { x, y, w, h } = window;

        // Crop the image
        image.crop(x, y, w, h);

        // Convert cropped image back to buffer
        const croppedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

        // Return the cropped image buffer
        return croppedBuffer;
    } catch (err) {
        // Handle errors
        throw new Error(`Error capturing or processing window: ${err}`);
    }
};

// Export the captureWindow function
module.exports = captureWindow;
