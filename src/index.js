const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const csvParser = require('csv-parser');
const path = require('path');
const fs = require('fs');
// const huntSessionPath = path.join(__dirname, 'farmTracker', 'models', 'huntSession');
// const setupPath = path.join(__dirname, 'farmTracker', 'helpers', 'setup');
// const setup = require(setupPath);
// const HuntSession = require(huntSessionPath);

const HuntSession = require('./farmTracker/models/huntSession');
const setup = require('./farmTracker/helpers/setup');
const { loadPokemonList } = require('./farmTracker/helpers/pokemonList');

let huntSession = HuntSession.getInstance();
let mainWindow;
let huntingWindow;
let huntingDisplayId;
let isSessionRunning = false;
let listenersAttached = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  huntSession.pokemonList = await loadPokemonList();
  huntSession.pokemonSet = new Set(huntSession.pokemonList);
  attachListeners();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('setup', async () => {
  try {
    mainWindow.webContents.send('setup-start');
    const setUpComplete = await setup();

    if (!setUpComplete.status) {
      console.error('Setup Failed: No Wild Encounter Detected On-Screen', setUpComplete.error);
      mainWindow.webContents.send('setup-failed', setUpComplete);
    } else {
      console.log('Setup complete');
      huntingWindow = setUpComplete.window;
      huntingDisplayId = setUpComplete.displayId;
      mainWindow.webContents.send('setup-complete', setUpComplete);
      huntSession.setUpWindow(huntingWindow, huntingDisplayId);
    }
  } catch (error) {
    console.error('Error during setup process:', error);
    mainWindow.webContents.send('setup-failed', { status: false, error: error.message });
  }
});

ipcMain.on('start-capture', async () => {
  if (huntSession && !isSessionRunning) {
    await huntSession.startCaptureInterval(3000);
    isSessionRunning = true;
    mainWindow.webContents.send('session-state', { isSessionRunning });

    if (!listenersAttached) {
      attachListeners();
    }
  } else {
    console.log('Session is already running or HuntSession not initialized.');
  }
});

ipcMain.on('stop-capture', async () => {
  if (huntSession && isSessionRunning) {
    await huntSession.stopCaptureInterval();
    isSessionRunning = false;
    mainWindow.webContents.send('session-state', { isSessionRunning });
  } else {
    console.log('HuntSession not started or already stopped.');
  }
});

ipcMain.on('reset-capture', () => {
  if (huntSession && !isSessionRunning) {
    huntSession.reset();
  } else {
    console.log('Reset disabled: HuntSession is running.');
  }
});

ipcMain.handle('save-dialog', async () => {
  const fileName = huntSession.fileName || 'export.csv';

  const result = await dialog.showSaveDialog({
    title: 'Export CSV',
    defaultPath: fileName,
    buttonLabel: 'Export',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  return result;
});

ipcMain.on('export-session', (_event, filename) => {
  if (!huntSession.isActive()) {
    huntSession.exportSessionToCSV(filename);
  } else {
    console.log('Cannot export session: It is running.');
  }
});

// Handle open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import CSV',
    buttonLabel: 'Import',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  });
  return result;
});

ipcMain.on('import-session', (_event, filePath) => {
  if (!huntSession.isActive()) {
    const importedData = [];
    console.log(filePath);
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        importedData.push(row);
      })
      .on('end', () => {
        huntSession.importSessionFromCSV(importedData);
        mainWindow.webContents.send('import-complete', importedData);
        huntSession.fileName = extractFileName(filePath);
      })
      .on('error', (err) => {
        console.error('Error reading CSV file:', err);
        mainWindow.webContents.send('import-failed');
      });
  } else {
    console.log('Cannot import session: It is running.');
  }
});

function extractFileName(filePath) {
  // Extract the file name from the path
  const fullFileName = filePath.split(path.sep).pop();
  // Remove the .csv extension
  const fileName = fullFileName.replace('.csv', '');
  return fileName;
}

// Attach listeners function
function attachListeners() {
  if (!listenersAttached) {
    huntSession.on('newEncounter', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('noEncounter', (data) => {
      mainWindow.webContents.send('update-count-noEncounter', data);
    });

    huntSession.on('reset-count', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('update-timer', (timeString) => {
      let timeOfDay = huntSession.getTimeOfDay()
      mainWindow.webContents.send('update-timer', { timeString, timeOfDay });
    });

    huntSession.on('update-count', (data) => {
      console.log('update-count event:', data);
      mainWindow.webContents.send('update-count', data);
    });

    listenersAttached = true; // Set flag to true after attaching listeners
  }
}
// Toggle always on top
ipcMain.on('toggle-always-on-top', () => {
  const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
  mainWindow.webContents.send('always-on-top-toggled', !isAlwaysOnTop);
});

ipcMain.on('adjust-window-height', (_event, newHeight) => {
  const [currentWidth] = mainWindow.getSize();
  const [currentX, currentY] = mainWindow.getPosition();

  mainWindow.setBounds({
    x: currentX,
    y: currentY,
    width: currentWidth,
    height: newHeight + 50 // Add some padding to the new height
  });
});

// ipcMain handlers
ipcMain.on('increment-pokemon', (event, pokemonName) => {
  if (!huntSession.pokemonCounts[pokemonName]) {
    huntSession.pokemonCounts[pokemonName] = 0;
  }
  huntSession.pokemonCounts[pokemonName] += 1;
  huntSession.wildCount += 1
  sendUpdatedCount(event, pokemonName);
});

ipcMain.on('decrement-pokemon', (event, pokemonName) => {
  if (huntSession.pokemonCounts[pokemonName] > 0) {
    huntSession.pokemonCounts[pokemonName] -= 1;
    huntSession.wildCount -= 1
  }
  sendUpdatedCount(event, pokemonName);
});

function sendUpdatedCount(event, pokemonName) {
  event.sender.send('update-count', {
    currPoke: pokemonName,
    wildCount: huntSession.wildCount,
    pokemonCounts: huntSession.pokemonCounts,
    isSessionRunning: huntSession.isSessionRunning // Ensure session state is sent
  });
}

// Increment time count
ipcMain.on('increment-time-count', (event, { name, time }) => {
  if (!huntSession.pokemonCounts[name]) {
    huntSession.pokemonCounts[name] = { total: 0, m: 0, d: 0, n: 0 };
  }

  // Increment time-based counts (morning, day, night) if applicable
  if (time === 'm') {
    huntSession.pokemonCounts[name].m += 1;
  } else if (time === 'd') {
    huntSession.pokemonCounts[name].d += 1;
  } else if (time === 'n') {
    huntSession.pokemonCounts[name].n += 1;
  }

  huntSession.pokemonCounts[name].total += 1;
  huntSession.wildCount += 1;

  sendUpdatedCount(event, name);
});

// Decrement time count
ipcMain.on('decrement-time-count', (event, { name, time }) => {
  if (huntSession.pokemonCounts[name] && ['m', 'd', 'n'].includes(time)) {
    const count = huntSession.pokemonCounts[name][time];
    if (count > 0) {
      huntSession.pokemonCounts[name][time] -= 1;
      huntSession.pokemonCounts[name].total -= 1;
      huntSession.wildCount -= 1;

      sendUpdatedCount(event, name);
    }
  }
});

// Delete Pokémon
ipcMain.on('delete-pokemon', (event, name) => {
  if (huntSession.pokemonCounts[name]) {
    huntSession.wildCount -= huntSession.pokemonCounts[name].total || 0;
    delete huntSession.pokemonCounts[name];
    sendUpdatedCount(event, name);
  }
});
