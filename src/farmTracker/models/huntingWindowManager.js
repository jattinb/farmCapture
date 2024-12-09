// huntingWindowManager.js
class HuntingWindowManager {
    constructor() {
        this.data = {
            window: null,
            displayId: null,
        };
    }

    // Unified getter to access the data object
    getWindowAndDisplayId() {
        return this.data;
    }

    // Unified setter to update the data object
    setWindowAndDisplayId(window, displayId) {
        this.data = { window, displayId }
        console.log(this.data, 'Here')

        // Automatically adjust the hunting window when the window is updated
        if (this.data.window) {
            this.adjustHuntingWindow();
        }
    }

    // Reset the window and display ID
    resetState() {
        this.data = {
            window: null,
            displayId: null,
        };
        console.log('Window and display ID reset');
    }

    // Adjust the hunting window with some padding
    adjustHuntingWindow() {
        const { window } = this.data;

        if (!window || typeof window.x === 'undefined' || typeof window.w === 'undefined') {
            console.error('Invalid huntingWindow object provided');
            return;
        }

        // Adjust window dimensions
        this.data.window = {
            x: window.x - 50,
            y: window.y - 50,
            w: window.w + 150,
            h: window.h + 75,
        };

        console.log('Window adjusted:', this.data.window);
    }
}

module.exports = HuntingWindowManager;
