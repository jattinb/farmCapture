// electron_app/rendered.js

const { ipcRenderer } = require('electron');

// Send IPC event to start capture
document.getElementById('startCapture').addEventListener('click', () => {
    ipcRenderer.send('start-capture');
    updateStatus(true); // Update status when capture starts
});

// Send IPC event to stop capture
document.getElementById('stopCapture').addEventListener('click', () => {
    ipcRenderer.send('stop-capture');
    updateStatus(false); // Update status when capture stops
});

// Send IPC event to setup
document.getElementById('setup').addEventListener('click', async () => {
    try {
        ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
    } catch (error) {
        console.error('Error sending setup request:', error);
    }
});

// Function to update the status text and color
function updateStatus(isActive) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = isActive ? 'Capture Active' : 'Capture Stopped';
    statusElement.classList.remove(isActive ? 'status-stopped' : 'status-active');
    statusElement.classList.add(isActive ? 'status-active' : 'status-stopped');
}

ipcRenderer.on('update-count', (event, data) => {
    const pokemonList = document.getElementById('pokemonList');
    pokemonList.innerHTML = ''; // Clear previous list items

    Object.entries(data.pokemonCounts).forEach(([pokemon, count]) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${pokemon}: ${count}`;
        pokemonList.appendChild(listItem);
    });
});

