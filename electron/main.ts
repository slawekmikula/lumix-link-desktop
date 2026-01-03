import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import url from 'node:url';

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b1e2d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = url.pathToFileURL(path.join(__dirname, '../dist/index.html')).toString();
    mainWindow.loadURL(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.focus();
    return miniWindow;
  }

  miniWindow = new BrowserWindow({
    width: 320,
    height: 220,
    alwaysOnTop: true,
    frame: true,
    title: 'Lumix Quick Controls',
    backgroundColor: '#0b1e2d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const target = process.env.NODE_ENV === 'development'
    ? `${VITE_DEV_SERVER_URL}/mini.html`
    : url.pathToFileURL(path.join(__dirname, '../dist/mini.html')).toString();

  miniWindow.loadURL(target);

  miniWindow.on('closed', () => {
    miniWindow = null;
  });

  return miniWindow;
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('mini.open', () => {
  const win = createMiniWindow();
  return !!win;
});

ipcMain.handle('mini.close', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
    miniWindow = null;
  }
  return true;
});
