const path = require('path');
const EventEmitter = require('events');
const formatTimePath = path.join(__dirname, '..', 'helpers', 'formatTime');
const { formatTime } = require(formatTimePath);

class Timer extends EventEmitter {
    constructor(elapsedTime = 0) {
        if (Timer.instance) {
            return Timer.instance;
        }

        super();
        this.timer = null;
        this.startTime = 0;
        this.elapsedTime = elapsedTime;

        Timer.instance = this;
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

    loadTime(milliseconds) {
        this.stop();
        this.elapsedTime = milliseconds;
        this.emit('update-timer', formatTime(this.elapsedTime));
    }

    static getInstance(elapsedTime = 0) {
        if (!Timer.instance) {
            Timer.instance = new Timer(elapsedTime);
        }
        return Timer.instance;
    }
}

module.exports = Timer;
