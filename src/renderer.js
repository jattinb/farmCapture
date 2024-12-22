// electron_app/renderer.js

const { ipcRenderer } = require('electron');

let dropdownState = {};

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
    const setupButton = document.getElementById('setup');
    const exportButton = document.getElementById('exportCSV');
    const importButton = document.getElementById('importCSV');
    const resetButton = document.getElementById('reset');

    Array.from(plusBtns).forEach(btn => (btn.disabled = disable));
    Array.from(minusBtns).forEach(btn => (btn.disabled = disable));
    Array.from(deleteBtns).forEach(btn => (btn.disabled = disable));
    setupButton.disabled = disable;
    exportButton.disabled = disable;
    importButton.disabled = disable;
    resetButton.disabled = disable;
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

ipcRenderer.on('update-timer', (_event, data) => {
    const { timeString, timeOfDay } = data;

    document.getElementById('farmDuration').textContent = `${timeString}`;

    // Update the Poketime text with the corresponding time of day
    const timeOfDayText = {
        m: 'Morning',
        d: 'Day',
        n: 'Night',
    };

    const timeOfDayColors = {
        m: 'yellow',
        d: 'gold',
        n: 'darkblue',
    };

    const pokeTimeElement = document.getElementById('pokeTime');
    pokeTimeElement.innerHTML = `<strong>${timeOfDayText[timeOfDay] || 'Unknown'}</strong>`;

    // Apply the corresponding color style
    pokeTimeElement.style.color = timeOfDayColors[timeOfDay] || 'white';
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

function updatePokemonTable(pokemonData, currentEncounter, totalEncounters, isSessionRunning) {
    const tableBody = document.getElementById('pokemonTableBody');
    const currentEncounterLower = currentEncounter.toLowerCase();

    if (pokemonData) {
        // Save the current state of dropdowns
        const openDropdowns = { ...dropdownState };

        // Reset dropdownState to ensure removed Pokémon don't persist in state
        dropdownState = {};

        tableBody.innerHTML = '';

        // Convert pokemonData to array and sort by frequency
        const sortedPokemonData = Object.entries(pokemonData)
            .map(([name, counts]) => ({ name, counts }))
            .sort((b, a) => b.counts.total - a.counts.total); // Sort by total encounters in ascending order

        const totalCounts = Object.values(pokemonData).reduce((totals, pokemon) => {
            totals.m += pokemon.m;
            totals.d += pokemon.d;
            totals.n += pokemon.n;
            return totals;
        }, { m: 0, d: 0, n: 0 });

        sortedPokemonData.forEach((pokemon) => {
            const { name, counts } = pokemon;
            const total = counts.total;

            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const percentageCell = document.createElement('td');
            const countCell = document.createElement('td');
            const actionCell = document.createElement('td');

            // Add Pokémon name
            nameCell.textContent = capitalizeFirstLetter(name);

            // Add count and percentage
            countCell.textContent = total;
            percentageCell.textContent = total > 0 ? `${((total / totalEncounters) * 100).toFixed(1)}%` : '0%';

            // Add action buttons
            const expandBtn = document.createElement('button');
            expandBtn.textContent = '▼';
            expandBtn.classList.add('button', 'button-expand', 'button-action');
            expandBtn.addEventListener('click', () => toggleDropdown(name));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.classList.add('button', 'button-delete', 'button-action');
            deleteBtn.disabled = isSessionRunning;
            deleteBtn.addEventListener('click', () => deletePokemon(name));

            actionCell.appendChild(expandBtn);
            actionCell.appendChild(deleteBtn);

            // Append cells to row
            row.appendChild(nameCell);
            row.appendChild(percentageCell);
            row.appendChild(countCell);
            row.appendChild(actionCell);

            // Highlight the current encounter row
            if (isSessionRunning && currentEncounterLower === name.toLowerCase()) {
                row.classList.add('current-pokemon');
            }

            tableBody.appendChild(row);

            // Add dropdown row
            const dropdownRow = createDropdownRow(name, counts, totalCounts, totalEncounters, isSessionRunning);
            tableBody.appendChild(dropdownRow);

            // Restore dropdown state if it was open before
            if (openDropdowns[name]) {
                dropdownRow.style.display = 'table-row';
                dropdownState[name] = true; // Reapply state
            }
        });
    }
}

// Create a dropdown row for time-specific data
function createDropdownRow(name, counts, totalCounts, totalEncounters, isSessionRunning) {
    const row = document.createElement('tr');
    row.classList.add('dropdown-row', `dropdown-${name}`);
    row.style.display = 'none'; // Hidden by default

    const cell = document.createElement('td');
    cell.colSpan = 4;

    const dropdownTable = document.createElement('table');
    dropdownTable.classList.add('dropdown-table');

    // Exclude 'Total' from time frames
    const timeFrames = ['Morning', 'Day', 'Night'];
    timeFrames.forEach((time) => {
        const subRow = document.createElement('tr');

        const timeCell = document.createElement('td');
        timeCell.textContent = time;

        const countCell = document.createElement('td');
        const timeKey = time.toLowerCase()[0]; // 'm' for morning, 'd' for day, 'n' for night
        const timeCount = counts[timeKey] || 0;
        countCell.textContent = timeCount;

        const percentageCell = document.createElement('td');
        percentageCell.textContent =
            timeCount > 0 ? `${((timeCount / totalCounts[timeKey]) * 100).toFixed(1)}%` : '0%';

        const actionCell = document.createElement('td');
        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.classList.add('button', 'button-plus', 'button-action');
        plusBtn.disabled = isSessionRunning;
        plusBtn.addEventListener('click', () => incrementTimeCount(name, timeKey));

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.classList.add('button', 'button-minus', 'button-action');
        minusBtn.disabled = isSessionRunning;
        minusBtn.addEventListener('click', () => decrementTimeCount(name, timeKey));

        actionCell.appendChild(plusBtn);
        actionCell.appendChild(minusBtn);

        subRow.appendChild(timeCell);
        subRow.appendChild(percentageCell);
        subRow.appendChild(countCell);
        subRow.appendChild(actionCell);

        dropdownTable.appendChild(subRow);
    });

    cell.appendChild(dropdownTable);
    row.appendChild(cell);

    return row;
}

// Function to toggle dropdown visibility and change arrow direction
function toggleDropdown(name) {
    const dropdownRow = document.querySelector(`.dropdown-${name}`);
    const expandBtn = document.querySelector(`.dropdown-${name}`).previousSibling.querySelector('.button-expand');

    if (dropdownRow) {
        const isCurrentlyVisible = dropdownRow.style.display !== 'none';
        dropdownRow.style.display = isCurrentlyVisible ? 'none' : 'table-row';
        dropdownState[name] = !isCurrentlyVisible; // Update state

        // Change arrow direction
        expandBtn.textContent = isCurrentlyVisible ? '▼' : '▲'; // ▼ for closed, ▲ for open
    }
}


// Function to increment time count
function incrementTimeCount(name, time) {
    ipcRenderer.send('increment-time-count', { name, time });
}

// Function to decrement time count
function decrementTimeCount(name, time) {
    ipcRenderer.send('decrement-time-count', { name, time });
}

// Function to delete a Pokémon
function deletePokemon(name) {
    ipcRenderer.send('delete-pokemon', name);
}

