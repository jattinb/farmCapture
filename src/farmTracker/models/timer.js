const { formatTime } = require('./../helpers/formatTime');
const { EventEmitter } = require('events');

class Timer extends EventEmitter {
    constructor(elapsedTime = 0) {
        super()

        this.timer = null;
        this.elapsedTime = elapsedTime;
        this.startTime = 0; // Store start time
    }

    // Start the timer
    start() {
        if (this.timer) {
            // If the timer is already running, do not start a new one
            return;
        }
        this.startTime = Date.now() - this.elapsedTime;
        this.timer = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.emit('update-timer', this.getFormattedTime());
            this._logTimeUpdate();
        }, 1000);
    }

    // Stop the timer
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this._logTimeUpdate();
        }
    }

    // Reset the timer
    reset() {
        this.stop();
        this.elapsedTime = 0;
        this.emit('update-timer', this.getFormattedTime());
        this._logTimeUpdate('reset');
    }

    // Load a specific time into the timer
    loadTime(milliseconds) {
        this.stop();
        this.elapsedTime = milliseconds;
        this._logTimeUpdate('loaded');
    }

    // Get the formatted elapsed time (as a string)
    getFormattedTime() {
        return formatTime(this.elapsedTime);
    }

    // Private helper method to log the time updates
    _logTimeUpdate(action = 'updated') {
        console.log(`Timer ${action}: ${this.getFormattedTime()}`);
    }
}

module.exports = Timer;
