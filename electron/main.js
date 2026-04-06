'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Data directory ────────────────────────────────────────────────────────────
// Production (packaged): app userData — writable, survives updates
// Development (unpackaged): project ./data/ — committable to git
const dataDir = app.isPackaged
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '../data');

fs.mkdirSync(dataDir, { recursive: true });
process.env.APP_DATA_DIR = dataDir;

// ── Start backend servers ─────────────────────────────────────────────────────
// Both Express servers (proxy :8080 + UI :8081) start here, before the window
// opens, so they're ready by the time loadURL() fires.
require('../server/index.js');

let mainWindow = null;
let tray = null;

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0d0d',
    title: 'API Mock Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // VITE_DEV=1 → load from Vite dev server (hot reload via `electron:hot`)
  // default    → load from Express UI server (works after `npm run build`)
  const uiUrl = process.env.VITE_DEV === '1'
    ? 'http://localhost:5173'
    : 'http://localhost:8081';

  mainWindow.loadURL(uiUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('API Mock Studio');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open API Mock Studio',
      click() { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } },
    },
    { type: 'separator' },
    { label: 'Proxy  →  localhost:8080', enabled: false },
    { label: 'UI       →  localhost:8081', enabled: false },
    { type: 'separator' },
    {
      label: 'Open in Browser',
      click() { shell.openExternal('http://localhost:8081'); },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click() { app.quit(); },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  app.quit();
});

// macOS: re-create window when clicking dock icon after all windows are closed.
app.on('activate', () => {
  if (!mainWindow) createWindow();
});
