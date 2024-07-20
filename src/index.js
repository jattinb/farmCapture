const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const huntSessionPath = path.join(__dirname, 'farmTracker', 'models', 'huntSession');
const setupPath = path.join(__dirname, 'farmTracker', 'helpers', 'setup');
const setup = require(setupPath);
const csvParser = require('csv-parser');
const HuntSession = require(huntSessionPath);

let huntSession = HuntSession.getInstance();
let mainWindow;
let huntingWindow;
let huntingDisplayId;
let isSessionRunning = false;
let listenersAttached = false;

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  attachListeners();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('setup', async () => {
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
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  return result;
});

ipcMain.on('export-session', (filename) => {
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
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ],
    properties: ['openFile']
  });
  return result;
});

// Handle CSV import and parsing
ipcMain.on('import-session', (filePath) => {
  if (!huntSession.isActive()) {
    const importedData = [];

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
