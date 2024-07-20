const screenshot = require('screenshot-desktop');

// Function to capture the window using screenshot-desktop and return the cropped image buffer
const captureWindow = async (displayId) => {
    try {
        // Capture the screenshot of the specific screen
        const imgBuffer = await screenshot({ screen: displayId });

        // Return the cropped image buffer
        return imgBuffer
    } catch (err) {
        // Handle errors
        throw new Error(`Error capturing or processing window: ${err}`);
    }
};

// Export the captureWindow function
module.exports = captureWindow;
