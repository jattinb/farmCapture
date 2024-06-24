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
    console.log('Setup complete:', data);
});

ipcRenderer.on('update-count', (event, data) => {
    // Transform the data to the required format
    const pokemonData = Object.entries(data.pokemonCounts).map(([name, freq]) => ({ name, freq }));
    // Update the Pokémon table with the new data
    updatePokemonTable(pokemonData);

    // Update total wild encounters
    const totalEncounters = Object.values(data.pokemonCounts).reduce((sum, count) => sum + count, 0);
    document.getElementById('totalEncounters').textContent = `Total Wild Encounters: ${totalEncounters}`;
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
