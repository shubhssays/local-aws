import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { startServer } from '../create-server.js';
import { getClientHost } from '../lib/settings.js';

let mainWindow: BrowserWindow | null = null;
let serverInstance: FastifyInstance | null = null;
let serverPort: number | null = null;
let serverClientHost = '127.0.0.1';

export function getPublicDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'public');
  }
  return path.join(app.getAppPath(), 'public');
}

async function startBackend(): Promise<{ port: number; clientHost: string }> {
  process.env.LOCAL_AWS_SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

  const { port, server, host } = await startServer({
    publicDir: getPublicDir(),
    quiet: true,
  });
  serverInstance = server;
  const clientHost = getClientHost(host);
  return { port, clientHost };
}

function createWindow(port: number, clientHost: string) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'local-aws',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://${clientHost}:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const { port, clientHost } = await startBackend();
      serverPort = port;
      serverClientHost = clientHost;
      createWindow(port, clientHost);
    } catch (err) {
      console.error('Failed to start local-aws server:', err);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
      createWindow(serverPort, serverClientHost);
    }
  });

  app.on('before-quit', () => {
    void serverInstance?.close();
  });
}
