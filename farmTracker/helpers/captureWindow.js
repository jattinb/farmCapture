const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');

// Function to capture the window using screenshot-desktop
const captureWindow = async (window, screenIndex) => {
    try {
        // Capture screenshots from all screens
        const screens = await screenshot.all({ format: 'png' });

        // Check if the screenIndex is within the range of screens
        if (screenIndex < 0 || screenIndex >= screens.length) {
            throw new Error('Invalid screen index');
        }

        // Get the specific screen image buffer based on screenIndex
        const imgBuffer = screens[screenIndex];

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
