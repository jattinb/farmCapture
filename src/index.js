// electron_app/main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HuntSession = require('../farmTracker/models/huntSession');

let huntSession;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('start-capture', () => {
  huntSession = new HuntSession();
  huntSession.startCaptureInterval(3000);

  huntSession.on('newEncounter', (data) => {
    mainWindow.webContents.send('update-count', data);
  });
});

ipcMain.on('stop-capture', () => {
  if (huntSession) {
    huntSession.stopCaptureInterval();
  } else {
    console.log('HuntSession not started or already stopped.');
  }
});
