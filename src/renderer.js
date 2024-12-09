// electron_app/renderer.js

const { ipcRenderer } = require('electron');

// Function to display a message
function displayMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.style.display = 'block';
    }
}

// Function to close a message
function closeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

// Function to capitalize the first letter
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Disable all controls
function disableAllControls() {
    document.getElementById('setup').disabled = true;
    document.getElementById('reset').disabled = true;
    document.getElementById('toggleCapture').disabled = true;
}

// Disable capture-related controls
function disableCaptureControls() {
    document.getElementById('toggleCapture').disabled = true;
}

// Enable capture-related controls
function enableCaptureControls() {
    document.getElementById('toggleCapture').disabled = false;
}

// Enable setup and reset controls
function enableSetupAndResetControls() {
    document.getElementById('setup').disabled = false;
    document.getElementById('reset').disabled = false;
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
    statusElement.classList.toggle('status-active', isActive);
    statusElement.classList.toggle('status-stopped', !isActive);
}

let isProcessing = false; // Flag to prevent double-clicks

// Function to toggle capture state
function toggleCapture() {
    if (isProcessing) return; // Prevent further clicks while processing
    isProcessing = true;

    const button = document.getElementById('toggleCapture');
    const isActive = button.classList.contains('button-green');

    if (isActive) {
        ipcRenderer.send('start-capture');
        button.classList.replace('button-green', 'button-red');
        button.textContent = 'Stop';
        toggleActionButtons(true);
    } else {
        ipcRenderer.send('stop-capture');
        button.classList.replace('button-red', 'button-green');
        button.textContent = 'Start';
        toggleActionButtons(false);

        // Remove 'current-pokemon' class from all current Pokémon elements
        const currPokeEles = document.getElementsByClassName('current-pokemon');
        Array.from(currPokeEles).forEach(ele => ele.classList.remove('current-pokemon'));
    }

    updateStatus(isActive);

    // Re-enable the button after a short delay to ensure operation completes
    setTimeout(() => {
        isProcessing = false;
    }, 500); // Adjust delay as needed
}


// Helper function to toggle action buttons
function toggleActionButtons(disable) {
    const plusBtns = document.getElementsByClassName('button-plus');
    const minusBtns = document.getElementsByClassName('button-minus');
    const deleteBtns = document.getElementsByClassName('button-delete');

    Array.from(plusBtns).forEach(btn => (btn.disabled = disable));
    Array.from(minusBtns).forEach(btn => (btn.disabled = disable));
    Array.from(deleteBtns).forEach(btn => (btn.disabled = disable));
}

// IPC event handlers
ipcRenderer.on('setup-start', disableAllControls); // Disable all controls during setup

ipcRenderer.on('setup-complete', () => {
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
    console.error("Setup Failed:", data.error);
    displayMessage('setupFailed'); // Display failed message
});

// Handle the update-count-noEncounter event
ipcRenderer.on('update-count-noEncounter', () => {
    const highlightedRow = document.querySelector('.current-pokemon');
    if (highlightedRow) {
        highlightedRow.classList.remove('current-pokemon'); // Remove the highlight
    }
    document.getElementById('currentEncounter').innerHTML = '<strong>No encounter</strong>';
});

ipcRenderer.on('update-count', (_, data) => {
    console.log(_, data.wildCount)
    const totalEncounters = data.wildCount;
    const pokemonData = data.pokemonCounts;
    const startButton = document.getElementById('toggleCapture');
    const isSessionRunning = startButton.classList.contains('button-red'); // Flag for session status
    const currentEncounter = (data.currPoke && isSessionRunning) ? capitalizeFirstLetter(data.currPoke) : 'No encounter';

    console.log(startButton.classList.contains('button-red'))
    updatePokemonTable(pokemonData, currentEncounter, totalEncounters, isSessionRunning);

    // Update total wild encounters
    document.getElementById('totalEncounters').innerHTML = `<strong>${totalEncounters}</strong>`;
    // Update current encounter
    document.getElementById('currentEncounter').innerHTML = `<strong>${currentEncounter}</strong>`;
});

// Function to update the Pokémon table and include action buttons
function updatePokemonTable(pokemonData, currentEncounter, totalEncounters, isSessionRunning) {
    const tableBody = document.getElementById('pokemonTableBody');
    const currentEncounterLower = currentEncounter.toLowerCase();

    if (pokemonData) {
        tableBody.innerHTML = '';

        // Convert pokemonData from object to array, then sort by frequency
        const sortedPokemonData = Object.entries(pokemonData)
            .map(([name, frequency]) => ({ name, frequency }))
            .sort((a, b) => a.frequency - b.frequency); // Sort by frequency in descending order

        sortedPokemonData.forEach(pokemon => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const percentageCell = document.createElement('td');
            const countCell = document.createElement('td');
            const actionCell = document.createElement('td'); // New cell for action buttons

            // Add Pokémon name
            nameCell.textContent = capitalizeFirstLetter(pokemon.name);

            // Add percentage and count, handling divide-by-zero for totalEncounters
            percentageCell.textContent = pokemon.frequency > 0
                ? `${((pokemon.frequency / totalEncounters) * 100).toFixed(1)}%`
                : "0%";
            countCell.textContent = pokemon.frequency;

            // Create action buttons for increment, decrement, and delete
            const actionButtons = document.createElement('div');
            actionButtons.classList.add('action-buttons');

            const plusBtn = document.createElement('button');
            plusBtn.textContent = '+';
            plusBtn.classList.add('button', 'button-plus');
            plusBtn.disabled = isSessionRunning;
            plusBtn.addEventListener('click', () => incrementPokemon(pokemon.name));

            const minusBtn = document.createElement('button');
            minusBtn.textContent = '-';
            minusBtn.classList.add('button', 'button-minus');
            minusBtn.disabled = isSessionRunning;
            minusBtn.addEventListener('click', () => decrementPokemon(pokemon.name));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.classList.add('button', 'button-delete');
            deleteBtn.disabled = isSessionRunning;
            deleteBtn.addEventListener('click', () => deletePokemon(pokemon.name));

            // Append buttons to action buttons container
            actionButtons.appendChild(plusBtn);
            actionButtons.appendChild(minusBtn);
            actionButtons.appendChild(deleteBtn);

            // Append action buttons to action cell
            actionCell.appendChild(actionButtons);

            // Append cells to row
            row.appendChild(nameCell);
            row.appendChild(percentageCell);
            row.appendChild(countCell);
            row.appendChild(actionCell);

            // Highlight the current encounter row
            if (isSessionRunning && (currentEncounterLower === pokemon.name.toLowerCase())) {
                row.classList.add('current-pokemon');
            }

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

// Function to increment Pokémon count
function incrementPokemon(name) {
    ipcRenderer.send('increment-pokemon', name);
}

// Function to decrement Pokémon count
function decrementPokemon(name) {
    ipcRenderer.send('decrement-pokemon', name);
}

// Function to delete Pokémon
function deletePokemon(name) {
    ipcRenderer.send('delete-pokemon', name);
}
