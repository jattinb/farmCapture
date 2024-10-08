// electron_app/renderer.js

const { ipcRenderer } = require('electron');

// Function to display a message
function displayMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    messageElement.style.display = 'block';
}


// Function to close a message
// eslint-disable-next-line no-unused-vars
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


ipcRenderer.on('setup-complete', (_event, data) => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    enableCaptureControls(); // Enable capture controls after setup is complete
    enableSetupAndResetControls(); // Enable setup and reset controls after setup is complete

    displayMessage('setupSuccess');
    console.log('Setup complete');
});

ipcRenderer.on('setup-failed', (event, data) => {
    const setupButton = document.getElementById('setup');
    setupButton.disabled = false;
    setupButton.classList.remove('button-loading');
    setupButton.classList.add('button-blue');
    setupButton.textContent = 'Setup';

    enableCaptureControls(); // Enable capture controls even if setup failed
    enableSetupAndResetControls(); // Enable setup and reset controls even if setup failed
    console.log("Setup Failed:", data.error);
    displayMessage('setupFailed'); // Display failed message
});

// Handle the update-count-noEncounter event
ipcRenderer.on('update-count-noEncounter', (_event) => {
    const highlightedRow = document.querySelector('.current-pokemon');
    if (highlightedRow) {
        highlightedRow.classList.remove('current-pokemon'); // Remove the highlight
    }

    // Clear the current encounter display
    document.getElementById('currentEncounter').innerHTML = '<strong>No encounter</strong>';
});

ipcRenderer.on('update-count', (_event, data) => {
    const currentEncounter = data.currPoke ? capitalizeFirstLetter(data.currPoke) : 'No encounter';
    const totalEncounters = data.wildCount; // Use wildCount for totalEncounters
    const pokemonData = data.pokemonCounts; // Use pokemonCounts for pokemonData

    updatePokemonTable(pokemonData, currentEncounter, totalEncounters);

    // Update total wild encounters
    document.getElementById('totalEncounters').innerHTML = `<strong>${totalEncounters}</strong>`;

    // Update current encounter
    document.getElementById('currentEncounter').innerHTML = `<strong>${currentEncounter}</strong>`;
});

// Function to update the Pokémon table
function updatePokemonTable(pokemonData, currentEncounter, totalEncounters) {
    const tableBody = document.getElementById('pokemonTableBody');
    const currentEncounterLower = currentEncounter.toLowerCase();

    // Clear existing rows only if there is any data to update
    if (pokemonData) {
        tableBody.innerHTML = '';

        // Convert pokemonData from object to array, then sort by frequency
        const sortedPokemonData = Object.entries(pokemonData)
            .map(([name, frequency]) => ({ name, frequency }))
            .sort((a, b) => a.frequency - b.frequency); // Sort by frequency in ascending order

        sortedPokemonData.forEach(pokemon => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const percentageCell = document.createElement('td');
            const countCell = document.createElement('td');

            nameCell.textContent = capitalizeFirstLetter(pokemon.name);
            percentageCell.textContent = `${((pokemon.frequency / totalEncounters) * 100).toFixed(1)}%`;
            countCell.textContent = pokemon.frequency;

            // Highlight the row if the Pokémon matches the current encounter
            if (pokemon.name.toLowerCase() === currentEncounterLower) {
                row.classList.add('current-pokemon');
            }

            row.appendChild(nameCell);
            row.appendChild(percentageCell);
            row.appendChild(countCell);
            tableBody.appendChild(row);
        });
    }
}


ipcRenderer.on('update-timer', (_event, timeString) => {
    document.getElementById('farmDuration').textContent = `${timeString}`;
});


ipcRenderer.on('import-complete', (_event, data) => {
    // You can choose to update the UI or display a success message here
    console.log('Import complete');
    displayMessage('importSuccess'); // Display a success message
});

// eslint-disable-next-line no-unused-vars
ipcRenderer.on('import-failed', (_event) => {
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

    const compactBtn = document.getElementById('toggleCompact');
    if (compactBtn) {
        let isCompact = false;

        // Initialize the button text
        compactBtn.textContent = isCompact ? 'Original' : 'Compact';

        compactBtn.addEventListener('click', () => {
            isCompact = !isCompact;
            ipcRenderer.send('toggle-size', isCompact);

            // Toggle CSS class on the body or main container
            const body = document.body; // Or another container element
            if (isCompact) {
                body.classList.add('compact-mode');
                compactBtn.textContent = 'Original';
            } else {
                body.classList.remove('compact-mode');
                compactBtn.textContent = 'Compact';
            }
        });
    } else {
        console.warn('Element with ID "toggleSizeBtn" not found.');
    }

    const captureBtn = document.getElementById('toggleCapture');
    if (captureBtn) {
        captureBtn.addEventListener('click', toggleCapture);
    } else {
        console.warn('Element with ID "toggleCapture" not found.');
    }
});


function toggleAlwaysOnTop() {
    ipcRenderer.send('toggle-always-on-top');
}

ipcRenderer.on('always-on-top-toggled', (_event, isAlwaysOnTop) => {
    const toggleButton = document.getElementById('toggleAlwaysOnTopButton');
    toggleButton.textContent = isAlwaysOnTop ? 'Disable Always On Top' : 'Enable Always On Top';
});
