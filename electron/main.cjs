const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

let mainWindow = null;
let serverProc = null;

function resolveDbPath() {
  const userDataDir = app.getPath('userData');
  fs.mkdirSync(userDataDir, { recursive: true });
  return path.join(userDataDir, 'history.db');
}

function startLocalBackend(port) {
  const appRoot = path.resolve(__dirname, '..');
  const serverEntry = path.join(appRoot, 'server.ts');
  const dbPath = resolveDbPath();

  serverProc = spawn(process.execPath, [serverEntry], {
    cwd: appRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: '127.0.0.1',
      WIFI_TESTER_DB_PATH: dbPath,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  });
}

function createWindow(port) {
  const iconPath = path.join(__dirname, '..', 'public', 'assets', 'aistudio', 'App_logo_7d567632.svg');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 360,
    minHeight: 620,
    title: 'Wi-Fi Tester',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#F0F2F5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const port = Number.parseInt(process.env.WIFI_TESTER_PORT || '31415', 10);
  startLocalBackend(port);
  setTimeout(() => createWindow(port), 400);
});

app.on('window-all-closed', () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  app.quit();
});
