import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import url from 'node:url';
import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import { pipeline } from 'node:stream/promises';

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let udpSocket: dgram.Socket | null = null;
let currentCameraIp: string | null = null;
let downloadDirectory = '';

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
    height: 175,
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
  downloadDirectory = path.join(app.getPath('pictures'), 'Lumix');
  if (!fs.existsSync(downloadDirectory)) {
    fs.mkdirSync(downloadDirectory, { recursive: true });
  }

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

ipcMain.handle('camera-request', async (_event, url: string, options: any = {}) => {
  try {
    // Uses Node.js native fetch which bypasses CORS
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Panasonic Image App',
        ...(options.headers || {}),
      },
      body: options.body,
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText} (${response.status}) for ${url}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Camera request failed for ${url}:`, error);
    throw error;
  }
});

ipcMain.handle('camera-request-binary', async (_event, url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Panasonic Image App',
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Camera binary request failed:', error);
    throw error;
  }
});

ipcMain.handle('get-thumbnail', async (_event, targetUrl: string, cacheKey: string) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Ensure cacheKey is safe filename
    const safeKey = cacheKey.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(cacheDir, safeKey);

    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath).toString('base64');
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Panasonic Image App',
      },
    });
    if (!response.ok) {
       // if 404 or others, maybe try without cache
       throw new Error(`Thumbnail fetch failed: ${response.statusText} for ${targetUrl}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    return buffer.toString('base64');
  } catch (err) {
    console.error('Thumbnail error:', err);
    throw err;
  }
});

ipcMain.handle('download-file', async (_event, fileUrl: string, fileName: string) => {
  if (!downloadDirectory) {
    downloadDirectory = path.join(app.getPath('pictures'), 'Lumix');
  }

  if (!fs.existsSync(downloadDirectory)) {
    fs.mkdirSync(downloadDirectory, { recursive: true });
  }

  const safeName = path.basename(fileName);
  const filePath = path.join(downloadDirectory, safeName);

  return new Promise((resolve, reject) => {
    console.log(`Starting download from ${fileUrl} to ${filePath}`);
    const req = http.get(fileUrl, {
      headers: {
        'User-Agent': 'Panasonic Image App',
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // consume response data to free up memory
        reject(new Error(`Failed to fetch file: ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      pipeline(res, fileStream)
        .then(() => {
          console.log('Download finished');
          resolve(filePath);
        })
        .catch((err) => {
          console.error('Pipeline error:', err);
          fs.unlink(filePath, () => {}); // cleanup
          reject(err);
        });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
    
    // Disable timeout for large files
    req.setTimeout(0);
  });
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

ipcMain.handle('get-download-directory', () => {
  if (!downloadDirectory) {
    downloadDirectory = path.join(app.getPath('pictures'), 'Lumix');
  }
  return downloadDirectory;
});

ipcMain.handle('set-download-directory', (_event, dirPath: string) => {
  if (!dirPath) return downloadDirectory;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  downloadDirectory = dirPath;
  return downloadDirectory;
});

ipcMain.handle('choose-download-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: 'Select download folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: downloadDirectory || path.join(app.getPath('pictures'), 'Lumix'),
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selected = result.filePaths[0];
  if (!fs.existsSync(selected)) {
    fs.mkdirSync(selected, { recursive: true });
  }
  downloadDirectory = selected;
  return selected;
});

ipcMain.handle('check-local-files', (_event, fileNames: string[]) => {
  const existing: Record<string, string> = {};
  if (!downloadDirectory || !Array.isArray(fileNames) || fileNames.length === 0) {
    return existing;
  }

  for (const name of fileNames) {
    const safeName = path.basename(name);
    const filePath = path.join(downloadDirectory, safeName);
    if (fs.existsSync(filePath)) {
      existing[name] = filePath;
    }
  }

  return existing;
});

ipcMain.handle('read-local-image-data-url', (_event, filePath: string) => {
  if (!filePath) {
    throw new Error('Missing file path');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
});

ipcMain.handle('open-local-path', async (_event, filePath: string) => {
  if (!filePath) {
    throw new Error('Missing file path');
  }

  const openResult = await shell.openPath(filePath);
  if (openResult) {
    throw new Error(openResult);
  }
  return true;
});

ipcMain.handle('delete-local-file', (_event, filePath: string) => {
  if (!filePath) {
    throw new Error('Missing file path');
  }

  if (!fs.existsSync(filePath)) {
    return true;
  }

  fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('show-error-dialog', async (_event, title: string, message: string) => {
  await dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'error',
    title: title || 'Error',
    message: title || 'Error',
    detail: message || 'Unknown error',
    buttons: ['OK'],
  });
  return true;
});
