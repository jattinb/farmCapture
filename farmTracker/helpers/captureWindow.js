const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');

// Function to capture the window using screenshot-desktop
const captureWindow = async () => {
    try {
        // Capture the screenshot of the desktop and get the image buffer
        const imgBuffer = await screenshot({ format: 'png' });

        // Use Jimp to read the image buffer
        const image = await Jimp.read(imgBuffer);

        // Define the coordinates and dimensions for cropping
        const x = 1000; // Example x coordinate
        const y = 515; // Example y coordinate
        const width = 700; // Example width
        const height = 115; // Example height

        // Crop the image
        image.crop(x, y, width, height);

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
