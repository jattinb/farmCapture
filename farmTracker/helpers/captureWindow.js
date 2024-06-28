const screenshot = require('screenshot-desktop');
const sharp = require('sharp');

// Function to capture the window using screenshot-desktop and process it with sharp
const captureWindow = async (window, displayId) => {
    try {
        // Capture the screenshot of the specific screen
        const imgBuffer = await screenshot({ screen: displayId, format: 'png' });

        // Assuming 'window' is an object with properties x, y, width, and height
        const { x, y, w, h } = window;

        // Use sharp to read, crop, and process the image buffer
        const croppedBuffer = await sharp(imgBuffer)
            .extract({ left: x, top: y, width: w, height: h })
            .png()
            .toBuffer();

        // Return the cropped image buffer
        return croppedBuffer;
    } catch (err) {
        // Handle errors
        throw new Error(`Error capturing or processing window: ${err}`);
    }
};

// Export the captureWindow function
module.exports = captureWindow;
