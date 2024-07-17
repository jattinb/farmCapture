// timeFormatter.js

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function parseTimeToMilliseconds(timeString) {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const totalMilliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;
    return totalMilliseconds;
}

module.exports = { formatTime, parseTimeToMilliseconds };
