// electron_app/renderer.js

const { ipcRenderer } = require('electron');

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

// Function to capitalize first letter
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Send IPC event to setup
document.getElementById('setup').addEventListener('click', () => {
    ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
});

// Send IPC event to reset
document.getElementById('reset').addEventListener('click', () => {
    ipcRenderer.send('reset-capture');
});

// Function to update the status text and color
function updateStatus(isActive) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = isActive ? 'Session Active' : 'Capture Disabled';
    statusElement.classList.remove(isActive ? 'status-stopped' : 'status-active');
    statusElement.classList.add(isActive ? 'status-active' : 'status-stopped');
}

// Function to toggle capture state
function toggleCapture() {
    const button = document.getElementById('toggleCapture');
    const isActive = button.classList.contains('button-green');

    if (isActive) {
        ipcRenderer.send('start-capture');
        button.classList.remove('button-green');
        button.classList.add('button-red');
        button.textContent = 'Stop Capture';
    } else {
        ipcRenderer.send('stop-capture');
        button.classList.remove('button-red');
        button.classList.add('button-green');
        button.textContent = 'Start Capture';
    }

    updateStatus(isActive);
}

ipcRenderer.on('setup-start', () => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.button');
    loadingElement.style.display = 'block';
    buttons.forEach(button => button.disabled = true);
});

ipcRenderer.on('setup-complete', (event, data) => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.button');
    loadingElement.style.display = 'none';
    buttons.forEach(button => button.disabled = false);

    document.getElementById('toggleCapture').disabled = false; // Enable Toggle Capture button

    displayMessage('setupSuccess');
    console.log('Setup complete:', data);
});

ipcRenderer.on('setup-failed', () => {
    const loadingElement = document.getElementById('loading');
    const buttons = document.querySelectorAll('.button');
    loadingElement.style.display = 'none';
    buttons.forEach(button => button.disabled = false);
    displayMessage('setupFailed'); // Display failed message
});

ipcRenderer.on('update-count', (event, data) => {
    // Transform the data to the required format
    const pokemonData = Object.entries(data.pokemonCounts).map(([name, frequency]) => ({ name, frequency }));
    // Update the Pokémon table with the new data
    updatePokemonTable(pokemonData);

    // Update total wild encounters
    const totalEncounters = Object.values(data.pokemonCounts).reduce((sum, count) => sum + count, 0);
    document.getElementById('totalEncounters').textContent = `${totalEncounters}`;

    // Update current encounter
    let currentEncounter = data.currPoke ? data.currPoke : 'No encounter';
    currentEncounter = capitalizeFirstLetter(currentEncounter)
    document.getElementById('currentEncounter').textContent = `${currentEncounter}`;
});

ipcRenderer.on('update-timer', (event, timeString) => {
    document.getElementById('farmDuration').textContent = `${timeString}`;
});

// Function to update the Pokémon table
function updatePokemonTable(pokemonData) {
    const tableBody = document.getElementById('pokemonTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    pokemonData.forEach(pokemon => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const freqCell = document.createElement('td');

        nameCell.textContent = capitalizeFirstLetter(pokemon.name); // Capitalize Pokémon name
        freqCell.textContent = pokemon.frequency;

        row.appendChild(nameCell);
        row.appendChild(freqCell);
        tableBody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const toggleInstructions = () => {
        const instructions = document.getElementById('instructions');
        if (instructions.style.display === 'none' || instructions.style.display === '') {
            instructions.style.display = 'block';
        } else {
            instructions.style.display = 'none';
        }
    };

    document.getElementById('toggleInstructionsBtn').addEventListener('click', toggleInstructions);

    // Add event listener to toggle capture button
    document.getElementById('toggleCapture').addEventListener('click', toggleCapture);
});
