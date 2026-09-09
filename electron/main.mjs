import { app, BrowserWindow, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isAllowedExternal(url) {
  return false;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current) event.preventDefault();
  });

  if (app.isPackaged) {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    void win.loadFile(indexPath);
  } else {
    void win.loadURL('http://127.0.0.1:3000');
  }
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!app.isPackaged && details.url.startsWith('http://127.0.0.1:3000')) {
      callback({ cancel: false });
      return;
    }
    if (details.url.startsWith('http://') || details.url.startsWith('https://') || details.url.startsWith('ws://') || details.url.startsWith('wss://')) {
      callback({ cancel: true });
      return;
    }
    callback({ cancel: false });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
