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
    countsDiv.innerHTML = `<p>Total encounters: ${data.wildCount}</p>`;

    const pokemonCounts = data.pokemonCounts;
    let countsHtml = '<ul>';
    for (const [pokemon, count] of Object.entries(pokemonCounts)) {
        countsHtml += `<li>${pokemon}: ${count}</li>`;
    }
    countsHtml += '</ul>';
    countsDiv.innerHTML += countsHtml;
});

