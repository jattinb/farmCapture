// electron_app/renderer.js

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
document.getElementById('setup').addEventListener('click', () => {
    ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
});

// Function to update the status text and color
function updateStatus(isActive) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = isActive ? 'Capture Active' : 'Capture Disabled';
    statusElement.classList.remove(isActive ? 'status-stopped' : 'status-active');
    statusElement.classList.add(isActive ? 'status-active' : 'status-stopped');
}

ipcRenderer.on('setup-start', () => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.btn');
    loadingElement.style.display = 'block';
    buttons.forEach(button => button.disabled = true);
});

ipcRenderer.on('setup-complete', (event, data) => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.btn');
    loadingElement.style.display = 'none';
    buttons.forEach(button => button.disabled = false);

    document.getElementById('startCapture').disabled = false; // Enable Start button
    document.getElementById('stopCapture').disabled = false; // Enable Stop button

    displayMessage('setupSuccess');
    console.log('Setup complete:', data);
});

ipcRenderer.on('setup-failed', () => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.btn');
    loadingElement.style.display = 'none';
    buttons.forEach(button => button.disabled = false);
    displayMessage('setupFailed'); // Display failed message
});

ipcRenderer.on('update-count', (event, data) => {
    // Transform the data to the required format
    const pokemonData = Object.entries(data.pokemonCounts).map(([name, freq]) => ({ name, freq }));
    // Update the Pokémon table with the new data
    updatePokemonTable(pokemonData);

    // Update total wild encounters
    const totalEncounters = Object.values(data.pokemonCounts).reduce((sum, count) => sum + count, 0);
    document.getElementById('totalEncounters').textContent = `Total Wild Encounters: ${totalEncounters}`;

    // Update current encounter
    const currentEncounter = data.currPoke ? data.currPoke : 'No encounter';
    document.getElementById('currentEncounter').textContent = `Current Encounter: ${currentEncounter}`;
});

// Function to update the Pokémon table
function updatePokemonTable(pokemonData) {
    const tableBody = document.getElementById('pokemonTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    pokemonData.forEach(pokemon => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const freqCell = document.createElement('td');

        nameCell.textContent = pokemon.name;
        freqCell.textContent = pokemon.freq;

        row.appendChild(nameCell);
        row.appendChild(freqCell);
        tableBody.appendChild(row);
    });
}

// Function to display a message
function displayMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    messageElement.style.display = 'block';
}

// Function to close a message
function closeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    messageElement.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const coll = document.querySelector('.collapsible');
    const content = document.querySelector('.content');

    coll.addEventListener('click', () => {
        coll.classList.toggle('active');
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
        }
    });
});
