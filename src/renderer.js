const { ipcRenderer } = require('electron');

class App {
    constructor() {
        this.dropdownState = {};
        this.appState = {
            isCaptureActive: false,
            isSetupInProgress: false,
            hasSetupRun: false,
        };
        this.isProcessing = false; // Flag to prevent double-clicks
    }

    // Utility Functions
    // -----------------

    displayMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.style.display = 'block';
        }
    }

    closeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.style.display = 'none';
        }
    }

    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    resetSetupButton() {
        const setupButton = document.getElementById('setup');
        if (setupButton) {
            setupButton.disabled = false;
            setupButton.classList.remove('button-loading');
            setupButton.classList.add('button-blue');
            setupButton.textContent = 'Setup';
        }
    }

    // Button Toggle Functions
    // -----------------------

    toggleButtons(disable, buttonTypes) {
        buttonTypes.forEach(type => {
            switch (type) {
                case 'action':
                    const plusBtns = document.getElementsByClassName('button-plus');
                    const minusBtns = document.getElementsByClassName('button-minus');
                    const deleteBtns = document.getElementsByClassName('button-delete');
                    Array.from(plusBtns).forEach(btn => (btn.disabled = disable));
                    Array.from(minusBtns).forEach(btn => (btn.disabled = disable));
                    Array.from(deleteBtns).forEach(btn => (btn.disabled = disable));
                    break;
                case 'setup':
                    const setupButton = document.getElementById('setup');
                    if (setupButton) setupButton.disabled = disable;
                    break;
                case 'reset':
                    const resetButton = document.getElementById('reset');
                    if (resetButton) resetButton.disabled = disable;
                    break;
                case 'importExport':
                    const exportButton = document.getElementById('exportCSV');
                    const importButton = document.getElementById('importCSV');
                    if (exportButton) exportButton.disabled = disable;
                    if (importButton) importButton.disabled = disable;
                    break;
                case 'capture':
                    const toggleKnob = document.getElementById('toggleKnob');
                    if (toggleKnob) toggleKnob.disabled = disable;
                    break;
            }
        });
    }

    updateButtonsState() {
        if (this.appState.isSetupInProgress) {
            this.toggleButtons(true, ['action', 'setup', 'reset', 'importExport', 'capture']);
        } else if (!this.appState.hasSetupRun) {
            this.toggleButtons(true, ['capture']);
            this.toggleButtons(false, ['importExport', 'reset', 'action']);
        } else if (this.appState.isCaptureActive) {
            this.toggleButtons(true, ['action', 'setup', 'reset', 'importExport']);
            this.toggleButtons(false, ['capture']);
        } else {
            this.toggleButtons(false, ['setup', 'reset', 'importExport', 'capture', 'action']);
        }
    }

    updateStatus(isActive) {
        const knob = document.getElementById('toggleKnob');
        if (knob) {
            knob.checked = isActive;
        }
    }

    toggleCapture() {
        if (this.isProcessing) return; // Prevent further clicks while processing
        this.isProcessing = true;

        this.appState.isCaptureActive = !this.appState.isCaptureActive;

        if (this.appState.isCaptureActive) {
            ipcRenderer.send('start-capture');
        } else {
            ipcRenderer.send('stop-capture');

            // Remove 'current-pokemon' class from all current Pokémon elements
            const currPokeEles = document.getElementsByClassName('current-pokemon');
            Array.from(currPokeEles).forEach(ele => ele.classList.remove('current-pokemon'));
        }

        this.updateStatus(this.appState.isCaptureActive);
        this.updateButtonsState();

        // Re-enable the button after a short delay to ensure operation completes
        setTimeout(() => {
            this.isProcessing = false;
        }, 500); // Adjust delay as needed
    }

    adjustWindowHeight() {
        const container = document.querySelector('.container');
        if (container) {
            const newHeight = container.scrollHeight;
            ipcRenderer.send('adjust-window-height', newHeight);
        }
    }

    init() {
        // Add event listener to toggle knob
        document.getElementById('toggleKnob').addEventListener('change', this.toggleCapture.bind(this));

        // Send IPC event to setup
        document.getElementById('setup').addEventListener('click', () => {
            if (!this.appState.isCaptureActive) {
                this.appState.isSetupInProgress = true;
                const setupButton = document.getElementById('setup');
                if (setupButton) {
                    setupButton.disabled = true;
                    setupButton.classList.add('button-loading');
                    setupButton.textContent = 'Working...';
                }
                this.updateButtonsState();
                ipcRenderer.send('setup'); // Send IPC event to trigger setup process in main.js
            }
        });

        // Send IPC event to reset
        document.getElementById('reset').addEventListener('click', () => {
            if (!this.appState.isCaptureActive) {
                ipcRenderer.send('reset-capture'); // Send IPC event to trigger reset process in main.js
            }
        });

        // Add event listener for importing CSV
        document.getElementById('importCSV').addEventListener('click', () => {
            if (!this.appState.isCaptureActive) {
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

        // Add event listener for exporting JSON
        document.getElementById('exportCSV').addEventListener('click', () => {
            if (!this.appState.isCaptureActive) {
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

        // Add event listener for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            const toggleInstructions = () => {
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    if (instructions.style.display === 'none' || instructions.style.display === '') {
                        instructions.style.display = 'block';
                    } else {
                        instructions.style.display = 'none';
                    }
                } else {
                    console.warn('Element with ID "instructions" not found.');
                }
                this.adjustWindowHeight()
            };

            const toggleInstructionsBtn = document.getElementById('toggleInstructionsBtn');
            if (toggleInstructionsBtn) {
                toggleInstructionsBtn.addEventListener('click', toggleInstructions);
            } else {
                console.warn('Element with ID "toggleInstructionsBtn" not found.');
            }

            // Add event listener to toggle capture knob
            const toggleKnob = document.getElementById('toggleKnob');
            if (toggleKnob) {
                toggleKnob.addEventListener('change', this.toggleCapture.bind(this));
            } else {
                console.warn('Element with ID "toggleKnob" not found.');
            }

            // Remove compact mode event listener
            // const compactBtn = document.getElementById('toggleCompact');
            // if (compactBtn) {
            //     let isCompact = false;

            //     // Initialize the button text
            //     compactBtn.textContent = isCompact ? 'Original' : 'Compact';

            //     compactBtn.addEventListener('click', () => {
            //         isCompact = !isCompact;
            //         ipcRenderer.send('toggle-size', isCompact);

            //         // Toggle CSS class on the body or main container
            //         const body = document.body; // Or another container element
            //         if (body) {
            //             if (isCompact) {
            //                 body.classList.add('compact-mode');
            //                 compactBtn.textContent = 'Original';
            //             } else {
            //                 body.classList.remove('compact-mode');
            //                 compactBtn.textContent = 'Compact';
            //             }
            //         } else {
            //             console.warn('Body element not found.');
            //         }
            //     });
            // } else {
            //     console.warn('Element with ID "toggleCompact" not found.');
            // }

            // Initial UI update based on the initial state
            this.updateButtonsState();

            // Adjust window height on initial load
            this.adjustWindowHeight();
        });

        // IPC Event Handlers
        // ------------------

        // IPC event handler for updating the table
        ipcRenderer.on('update-count', (event, data) => {
            this.updatePokemonTable(data.pokemonCounts, data.currPoke, data.wildCount);
            this.updateButtonsState()
        });

        // IPC event handlers for setup process
        ipcRenderer.on('setup-start', () => {
            this.appState.isSetupInProgress = true;
            this.updateButtonsState();
        }); // Disable all controls during setup

        ipcRenderer.on('setup-complete', () => {
            this.appState.isSetupInProgress = false;
            this.appState.hasSetupRun = true;
            this.updateButtonsState();
            this.resetSetupButton();
            this.displayMessage('setupSuccess');
            console.log('Setup complete');
        });

        ipcRenderer.on('setup-failed', (event, data) => {
            this.appState.isSetupInProgress = false;
            this.updateButtonsState();
            this.resetSetupButton();
            this.displayMessage('setupFailed', data);
            console.log('Setup failed', data);
        });

        // Handle the update-count-noEncounter event
        ipcRenderer.on('update-count-noEncounter', () => {
            const highlightedRow = document.querySelector('.current-pokemon');
            if (highlightedRow) {
                highlightedRow.classList.remove('current-pokemon'); // Remove the highlight
            }
            document.getElementById('currentEncounter').innerHTML = '<strong>No encounter</strong>';
        });

        ipcRenderer.on('always-on-top-toggled', (_event, isAlwaysOnTop) => {
            const toggleButton = document.getElementById('toggleAlwaysOnTopButton');
            toggleButton.textContent = isAlwaysOnTop ? 'Disable Always On Top' : 'Enable Always On Top';
        });

        ipcRenderer.on('import-complete', (event, importedData) => {
            console.log('Import complete:', importedData);
            this.displayMessage('importSuccess'); // Display a success message
            this.adjustWindowHeight(); // Adjust window height after import
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
    }

    toggleAlwaysOnTop() {
        ipcRenderer.send('toggle-always-on-top');
    }

    incrementPokemon(name) {
        ipcRenderer.send('increment-pokemon', name);
    }

    decrementPokemon(name) {
        ipcRenderer.send('decrement-pokemon', name);
    }

    deletePokemon(name) {
        ipcRenderer.send('delete-pokemon', name);
    }

    updatePokemonTable(pokemonData, currentEncounter, totalEncounters) {
        const tableBody = document.getElementById('pokemonTableBody');
        const currentEncounterLower = currentEncounter ? currentEncounter.toLowerCase() : '';

        if (pokemonData) {
            // Save the current state of dropdowns
            const openDropdowns = { ...this.dropdownState };

            // Reset dropdownState to ensure removed Pokémon don't persist in state
            this.dropdownState = {};

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

            // Update total wild encounters
            document.getElementById('totalEncounters').innerHTML = `<strong>${totalEncounters}</strong>`;

            // Update current encounter
            if (currentEncounter) {
                document.getElementById('currentEncounter').innerHTML = `<strong>${this.capitalizeFirstLetter(currentEncounter)}</strong>`;
            }

            sortedPokemonData.forEach((pokemon) => {
                const { name, counts } = pokemon;
                const total = counts.total;

                const row = document.createElement('tr');
                const nameCell = document.createElement('td');
                const percentageCell = document.createElement('td');
                const countCell = document.createElement('td');
                const actionCell = document.createElement('td');

                // Add Pokémon name
                nameCell.textContent = this.capitalizeFirstLetter(name);

                // Add count and percentage
                countCell.textContent = total;
                percentageCell.textContent = total > 0 ? `${((total / totalEncounters) * 100).toFixed(1)}%` : '0%';

                // Add action buttons
                const expandBtn = document.createElement('button');
                expandBtn.textContent = '▼';
                expandBtn.classList.add('button', 'button-expand', 'button-action');
                expandBtn.addEventListener('click', () => this.toggleDropdown(name));

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'X';
                deleteBtn.classList.add('button', 'button-delete', 'button-action');
                deleteBtn.disabled = this.appState.isCaptureActive;
                deleteBtn.addEventListener('click', () => this.deletePokemon(name));

                actionCell.appendChild(expandBtn);
                actionCell.appendChild(deleteBtn);

                // Append cells to row
                row.appendChild(nameCell);
                row.appendChild(percentageCell);
                row.appendChild(countCell);
                row.appendChild(actionCell);

                // Highlight the current encounter row
                if (this.appState.isCaptureActive && currentEncounterLower === name.toLowerCase()) {
                    row.classList.add('current-pokemon');
                }

                tableBody.appendChild(row);

                // Add dropdown row
                const dropdownRow = this.createDropdownRow(name, counts, totalCounts, totalEncounters);
                tableBody.appendChild(dropdownRow);

                this.adjustWindowHeight()

                // Restore dropdown state if it was open before
                if (openDropdowns[name]) {
                    dropdownRow.style.display = 'table-row';
                    this.dropdownState[name] = true; // Reapply state
                }
            });
        }
    }

    // Create a dropdown row for time-specific data
    createDropdownRow(name, counts, totalCounts, totalEncounters) {
        const row = document.createElement('tr');
        row.classList.add('dropdown-row', `dropdown-${name}`);
        row.style.display = 'none'; // Hidden by default

        const cell = document.createElement('td');
        cell.colSpan = 4;

        const dropdownTable = document.createElement('table');
        dropdownTable.classList.add('dropdown-table');

        // Add colgroup to ensure consistent column widths
        const colgroup = document.createElement('colgroup');
        colgroup.innerHTML = `
            <col style="width: 30%;">
            <col style="width: 25%;">
            <col style="width: 20%;">
            <col style="width: 25%;">
        `;
        dropdownTable.appendChild(colgroup);

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
            plusBtn.disabled = this.appState.isCaptureActive;
            plusBtn.addEventListener('click', () => this.incrementTimeCount(name, timeKey));

            const minusBtn = document.createElement('button');
            minusBtn.textContent = '-';
            minusBtn.classList.add('button', 'button-minus', 'button-action');
            minusBtn.disabled = this.appState.isCaptureActive;
            minusBtn.addEventListener('click', () => this.decrementTimeCount(name, timeKey));

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
    toggleDropdown(name) {
        const dropdownRow = document.querySelector(`.dropdown-${name}`);
        const expandBtn = document.querySelector(`.dropdown-${name}`).previousSibling.querySelector('.button-expand');

        if (dropdownRow) {
            const isCurrentlyVisible = dropdownRow.style.display !== 'none';
            dropdownRow.style.display = isCurrentlyVisible ? 'none' : 'table-row';
            this.dropdownState[name] = !isCurrentlyVisible; // Update state

            // Change arrow direction
            expandBtn.textContent = isCurrentlyVisible ? '▼' : '▲'; // ▼ for closed, ▲ for open
        }

        this.adjustWindowHeight()
    }

    // Function to increment time count
    incrementTimeCount(name, time) {
        ipcRenderer.send('increment-time-count', { name, time });
    }

    // Function to decrement time count
    decrementTimeCount(name, time) {
        ipcRenderer.send('decrement-time-count', { name, time });
    }

    // Function to delete a Pokémon
    deletePokemon(name) {
        ipcRenderer.send('delete-pokemon', name);
    }
}

// Initialize the app
const app = new App();
app.init();

// Expose functions to the global scope for HTML event handlers
window.closeMessage = (messageId) => app.closeMessage(messageId);
window.toggleAlwaysOnTop = () => app.toggleAlwaysOnTop();

