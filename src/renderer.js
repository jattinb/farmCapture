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

// Function to capitalize the first letter
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Disable all controls
function disableAllControls() {
    const setupButton = document.getElementById('setup');
    const resetButton = document.getElementById('reset');
    const toggleCaptureButton = document.getElementById('toggleCapture');

    setupButton.disabled = true;
    resetButton.disabled = true;
    toggleCaptureButton.disabled = true;
}

// Disable capture-related controls
function disableCaptureControls() {
    const toggleCaptureButton = document.getElementById('toggleCapture');
    toggleCaptureButton.disabled = true;
}

// Enable capture-related controls
function enableCaptureControls() {
    const toggleCaptureButton = document.getElementById('toggleCapture');
    toggleCaptureButton.disabled = false;
}

// Enable setup and reset controls
function enableSetupAndResetControls() {
    const setupButton = document.getElementById('setup');
    const resetButton = document.getElementById('reset');
    setupButton.disabled = false;
    resetButton.disabled = false;
}

// Send IPC event to setup
document.getElementById('setup').addEventListener('click', () => {
    const startButton = document.getElementById('toggleCapture');
    const isActive = startButton.classList.contains('button-red');

    if (!isActive) {
        const setupButton = document.getElementById('setup');
        setupButton.disabled = true;
        setupButton.classList.add('button-loading');
        setupButton.textContent = 'Working...';
        disableCaptureControls(); // Disable capture controls during setup
        ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
    }
});

// Send IPC event to reset
document.getElementById('reset').addEventListener('click', () => {
    const startButton = document.getElementById('toggleCapture');
    const isActive = startButton.classList.contains('button-red');

    if (!isActive) {
        ipcRenderer.send('reset-capture');
    }
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
    disableAllControls(); // Disable all controls during setup
});

ipcRenderer.on('setup-complete', (event, data) => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    enableCaptureControls(); // Enable capture controls after setup is complete
    enableSetupAndResetControls(); // Enable setup and reset controls after setup is complete

    displayMessage('setupSuccess');
    console.log('Setup complete:', data);
});

ipcRenderer.on('setup-failed', () => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    enableCaptureControls(); // Enable capture controls even if setup failed
    enableSetupAndResetControls(); // Enable setup and reset controls even if setup failed

    displayMessage('setupFailed'); // Display failed message
});

ipcRenderer.on('update-count', (event, data) => {
    console.log('Here update-count')
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
    console.log('Here update table')
    const tableBody = document.getElementById('pokemonTableBody');
    const totalEncountersCell = document.getElementById('totalEncounters');
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

    // Set total encounters in the footer
    totalEncountersCell.textContent = totalEncounters;
}

ipcRenderer.on('update-timer', (event, timeString) => {
    document.getElementById('farmDuration').textContent = `${timeString}`;
});

ipcRenderer.on('import-complete', (event, data) => {
    // You can choose to update the UI or display a success message here
    console.log('Import complete:', data);
    displayMessage('importSuccess'); // Display a success message
});

ipcRenderer.on('import-failed', (event) => {
    // You can choose to update the UI or display a success message here
    console.log('Import Failed');
    displayMessage('importFailed'); // Display a success message
});

// Send IPC event to export session to CSV
document.getElementById('exportCSV').addEventListener('click', () => {
    const startButton = document.getElementById('toggleCapture');
    const isActive = startButton.classList.contains('button-red');
    if (!isActive) {
        // Trigger save dialog
        ipcRenderer.invoke('save-dialog').then((result) => {
            if (!result.canceled) {
                const filename = result.filePath;
                ipcRenderer.send('export-session', filename);
            }
        }).catch((err) => {
            console.error(err);
        });
    }
});

document.getElementById('importCSV').addEventListener('click', () => {
    const startButton = document.getElementById('toggleCapture');
    const isActive = startButton.classList.contains('button-red');
    if (!isActive) {
        ipcRenderer.invoke('open-file-dialog').then((result) => {
            if (!result.canceled) {
                const filePath = result.filePaths[0];
                ipcRenderer.send('import-session', filePath);
            }
        }).catch((err) => {
            console.error(err);
        });
    }
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
