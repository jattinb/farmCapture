// farmTracker/models/Timer.js

const EventEmitter = require('events');
const formatTime = require("../helpers/formatTime");

class Timer extends EventEmitter {
    constructor() {
        super();
        this.timer = null;
        this.startTime = 0;
        this.elapsedTime = 0;
    }

    start() {
        this.startTime = Date.now() - this.elapsedTime;
        this.timer = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            const timeString = formatTime(this.elapsedTime);
            this.emit('update-timer', timeString);
        }, 1000);
    }

    stop() {
        clearInterval(this.timer);
    }

    reset() {
        this.stop();
        this.elapsedTime = 0;
        this.emit('update-timer', formatTime(this.elapsedTime));
    }
}

module.exports = Timer;
