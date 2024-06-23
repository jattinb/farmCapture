// electron_app/main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HuntSession = require('../farmTracker/models/huntSession');

const huntSession = new HuntSession();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Make sure nodeIntegration is enabled
      contextIsolation: false, // You can disable context isolation for now for simplicity
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

// Handle IPC events from renderer process
ipcMain.on('start-capture', () => {
  huntSession.startCaptureInterval(3000); // Example interval time
});

ipcMain.on('stop-capture', () => {
  huntSession.stopCaptureInterval();
});
