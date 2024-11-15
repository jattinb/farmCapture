// huntingWindowManager.js
class HuntingWindowManager {
    constructor() {
        this.window = null;
        this.displayId = null;
    }

    // Set both the hunting window and display ID, and adjust the window
    setWindowAndDisplayId(window, displayId) {
        if (!window || !displayId) {
            console.error('Invalid window or displayId provided');
            return;
        }
        this.window = window;
        this.displayId = displayId;
        console.log(`Window set with display ID: ${displayId}`);

        // Adjust the hunting window when it's set
        this.adjustHuntingWindow();
    }

    // Get the current hunting window
    getWindow() {
        if (!this.window) {
            console.error('Window not set');
        }
        return this.window;
    }

    // Get the current display ID
    getDisplayId() {
        if (!this.displayId) {
            console.error('Display ID not set');
        }
        return this.displayId;
    }

    // Reset the window and display ID
    resetWindow() {
        this.window = null;
        this.displayId = null;
        console.log('Window and display ID reset');
    }

    // Adjust the hunting window with some padding
    adjustHuntingWindow() {
        if (!this.window || typeof this.window.x === 'undefined' || typeof this.window.w === 'undefined') {
            console.error('Invalid huntingWindow object provided');
            return;
        }

        // Adjust window dimensions
        this.window = {
            x: this.window.x - 50,
            y: this.window.y - 50,
            w: this.window.w + 150,
            h: this.window.h + 75,
        };

        console.log('Window adjusted:', this.window);
    }
}

module.exports = HuntingWindowManager;
