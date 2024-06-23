// electron_app/rendered.js

const { ipcRenderer } = require('electron');

// Send IPC event to start capture
document.getElementById('startCapture').addEventListener('click', () => {
    ipcRenderer.send('start-capture');
});

// Send IPC event to stop capture
document.getElementById('stopCapture').addEventListener('click', () => {
    ipcRenderer.send('stop-capture');
});

// Listen for updates from the main process
ipcRenderer.on('update-count', (event, data) => {
    const countsDiv = document.getElementById('counts');
    countsDiv.innerHTML = `<p>Total encounters: ${data.wildCount}</p><pre>${JSON.stringify(data.pokemonCounts, null, 2)}</pre>`;
});
