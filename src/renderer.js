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
    const setupButton = document.getElementById('setup');
    setupButton.disabled = true;
    setupButton.classList.add('button-loading');
    setupButton.textContent = 'Setting up...';

    ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
});

// Send IPC event to reset
document.getElementById('reset').addEventListener('click', () => {
    ipcRenderer.send('reset-capture');
});

// Function to update the status text and color
function updateStatus(isActive) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = isActive ? 'Active' : 'Inactive';
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
        button.textContent = 'Stop';
    } else {
        ipcRenderer.send('stop-capture');
        button.classList.remove('button-red');
        button.classList.add('button-green');
        button.textContent = 'Start';
    }

    updateStatus(isActive);
}

ipcRenderer.on('setup-start', () => {
    // The setup button will already be in the loading state
});

ipcRenderer.on('setup-complete', (event, data) => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    document.getElementById('toggleCapture').disabled = false; // Enable Toggle Capture button

    displayMessage('setupSuccess');
    console.log('Setup complete:', data);
});

ipcRenderer.on('setup-failed', () => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    displayMessage('setupFailed'); // Display failed message
});

ipcRenderer.on('update-count', (event, data) => {
    // Transform the data to the required format
    const pokemonData = Object.entries(data.pokemonCounts).map(([name, frequency]) => ({ name, frequency }));
    // Update the Pokémon table with the new data
    const totalEncounters = Object.values(data.pokemonCounts).reduce((sum, count) => sum + count, 0);
    const currentEncounter = data.currPoke ? capitalizeFirstLetter(data.currPoke) : 'No encounter';

    updatePokemonTable(pokemonData, totalEncounters, currentEncounter);

    // Update total wild encounters
    document.getElementById('totalEncounters').innerHTML = `<strong>${totalEncounters}</strong>`;

    // Update current encounter
    document.getElementById('currentEncounter').innerHTML = `<strong>${currentEncounter}</strong>`;
});

// Function to update the Pokémon table
function updatePokemonTable(pokemonData, totalEncounters, currentEncounter) {
    const tableBody = document.getElementById('pokemonTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    pokemonData.sort((a, b) => a.frequency - b.frequency); // Sort by count in ascending order

    pokemonData.forEach(pokemon => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const percentageCell = document.createElement('td');
        const countCell = document.createElement('td');

        nameCell.textContent = capitalizeFirstLetter(pokemon.name); // Capitalize Pokémon name
        percentageCell.textContent = `${Math.ceil((pokemon.frequency / totalEncounters) * 100)}%`; // Round percentage up
        countCell.textContent = pokemon.frequency;

        if (pokemon.name.toLowerCase() === currentEncounter.toLowerCase()) {
            row.classList.add('current-pokemon'); // Add class for styling current Pokémon row
        }

        row.appendChild(nameCell);
        row.appendChild(percentageCell);
        row.appendChild(countCell);
        tableBody.appendChild(row);
    });
}


ipcRenderer.on('update-timer', (event, timeString) => {
    document.getElementById('farmDuration').textContent = `${timeString}`;
});

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
