const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const HuntSession = require('../farmTracker/models/huntSession');
const setup = require('../farmTracker/helpers/setup');
const csvParser = require('csv-parser');
const fs = require('fs');

let huntSession;
let mainWindow;
let huntingWindow;
let huntingDisplayId;
let isSessionRunning = false;
let listenersAttached;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  huntSession = HuntSession.getInstance();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  attachListeners()
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('setup', async (event) => {
  mainWindow.webContents.send('setup-start');
  const setUpComplete = await setup();
  if (!setUpComplete.status) {
    console.log('Setup Failed: No Wild Encounter Detected On-Screen');
    mainWindow.webContents.send('setup-failed', setUpComplete);
  } else {
    console.log('Setup complete');
    huntingWindow = setUpComplete.window;
    huntingDisplayId = setUpComplete.displayId;
    mainWindow.webContents.send('setup-complete', setUpComplete);
    huntSession.setUpWindow(huntingWindow, huntingDisplayId);
  }
});

ipcMain.on('start-capture', () => {
  if (huntSession && !isSessionRunning) {
    huntSession.startCaptureInterval(3000);
    isSessionRunning = true;
    mainWindow.webContents.send('session-state', { isSessionRunning });

    huntSession.on('newEncounter', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('noEncounter', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

  } else {
    console.log('Session is already running or HuntSession not initialized.');
  }
});

ipcMain.on('stop-capture', () => {
  if (huntSession && isSessionRunning) {
    huntSession.stopCaptureInterval();
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

ipcMain.handle('save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog({
    title: 'Export CSV',
    defaultPath: 'export.csv',
    buttonLabel: 'Export',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  return result;
});

ipcMain.on('export-session', (event, filename) => {
  if (huntSession) {
    huntSession.exportSessionToCSV(filename);
  } else {
    console.log('Cannot export session: HuntSession not active.');
    // Optionally send feedback to renderer process
  }
});

// Handle open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import CSV',
    buttonLabel: 'Import',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ],
    properties: ['openFile']
  });
  return result;
});

// Handle CSV import and parsing
ipcMain.on('import-session', (event, filePath) => {
  if (huntSession) {
    const importedData = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        importedData.push(row);
      })
      .on('end', () => {
        huntSession.importSessionFromCSV(importedData);
        mainWindow.webContents.send('import-complete', importedData);
      })
      .on('error', (err) => {
        console.error('Error reading CSV file:', err);
        mainWindow.webContents.send('import-failed')
      });
  } else {
    console.log('Cannot import session: HuntSession not active.');
  }
});

// Attach listeners function
function attachListeners() {
  if (!listenersAttached) {
    huntSession.on('newEncounter', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('noEncounter', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('reset-count', (data) => {
      mainWindow.webContents.send('update-count', data);
    });

    huntSession.on('update-timer', (timeString) => {
      mainWindow.webContents.send('update-timer', timeString);
    });

    huntSession.on('update-count', (timeString) => {
      mainWindow.webContents.send('update-count', timeString);
    });

    listenersAttached = true; // Set flag to true after attaching listeners
  }
}
