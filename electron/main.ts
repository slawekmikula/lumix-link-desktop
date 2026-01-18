import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import url from 'node:url';
import dgram from 'node:dgram';

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let udpSocket: dgram.Socket | null = null;
let currentCameraIp: string | null = null;

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
    height: 135,
    alwaysOnTop: true,
    frame: true,
    title: 'Lumix Quick Controls',
    backgroundColor: '#0b1e2d',
    autoHideMenuBar: true,
    minimizable: false,
    maximizable: false,
    type: 'utility',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  miniWindow.setMenu(null);

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

ipcMain.handle('camera-request', async (_event, url: string) => {
  try {
    // Uses Node.js native fetch which bypasses CORS
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Camera request failed:', error);
    throw error;
  }
});

function getImageDataStart(udpData: Buffer): number {
  let videoDataStart = 130;
  // The image data starts somewhere after the first 130 bytes, but at last in 320 bytes
  const limit = Math.min(320, udpData.length - 1);
  for (let k = 130; k < limit; k++) {
    // The bytes FF and D8 signify the start of the jpeg data
    if (udpData[k] === 0xFF && udpData[k + 1] === 0xD8) {
      videoDataStart = k;
    }
  }
  return videoDataStart;
}

ipcMain.handle('start-udp-listener', () => {
  if (udpSocket) {
    try {
      udpSocket.close();
    } catch (e) {
      console.error('Error closing existing socket:', e);
    }
    udpSocket = null;
  }

  try {
    udpSocket = dgram.createSocket('udp4');
    
    udpSocket.on('error', (err) => {
      console.error(`UDP socket error:\n${err.stack}`);
      if (udpSocket) udpSocket.close();
      udpSocket = null;
    });

    udpSocket.on('message', (msg, rinfo) => {
      // Process only packets around expected size if needed, or just try to decode all
      // The Java code mentions packets are normally 25k-30k bytes
      
      try {
        const start = getImageDataStart(msg);
        const imageBuffer = msg.subarray(start);
        const base64Image = imageBuffer.toString('base64');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('stream-frame', base64Image);
        }
      } catch (err) {
        console.error('Error processing UDP packet', err);
      }
    });

    udpSocket.bind(49199, () => {
        console.log('UDP Socket bound to port 49199');
    });

    return true;
  } catch (e) {
    console.error('Failed to create UDP socket', e);
    return false;
  }
});

ipcMain.handle('stop-udp-listener', () => {
  if (udpSocket) {
    udpSocket.close();
    udpSocket = null;
    console.log('UDP Socket closed');
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

ipcMain.handle('set-camera-ip', (_event, ip: string) => {
  currentCameraIp = ip;
  return true;
});

ipcMain.handle('get-camera-ip', () => {
  return currentCameraIp;
});
