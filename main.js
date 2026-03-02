const { app, BrowserWindow, nativeTheme, Menu, nativeImage, shell, clipboard, ipcMain } = require('electron');
const path = require('path');

// Use OS locale for the Electron instance (must be set before app ready)
const osLocale = Intl.DateTimeFormat().resolvedOptions().locale;
app.commandLine.appendSwitch('lang', osLocale);

const APP_URL = 'https://www.cvinna.se';
const ICON_PATH = path.join(__dirname, 'icon.png');

let isDeveloperMode = process.argv.includes('--enable-logging') || process.argv.includes('--developer');

function createChromeContextMenu(win, params) {
  const items = [];

  if (params.linkURL) {
    items.push(
      { label: 'Open Link in New Tab', click: () => shell.openExternal(params.linkURL) },
      { label: 'Copy Link', click: () => clipboard.writeText(params.linkURL) },
      { type: 'separator' }
    );
  }

  if (params.mediaType === 'image' && params.srcURL) {
    items.push(
      { label: 'Copy Image', click: () => win.webContents.copyImageAt(params.x, params.y) },
      { label: 'Save Image As...', click: () => win.webContents.downloadURL(params.srcURL) },
      { type: 'separator' }
    );
  }

  if (params.isEditable) {
    items.push(
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'selectAll' },
      { type: 'separator' }
    );
  } else if (params.selectionText) {
    items.push(
      { role: 'copy' },
      {
        label: `Search Google for "${params.selectionText.slice(0, 25)}${params.selectionText.length > 25 ? '…' : ''}"`,
        click: () => shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`),
      },
      { type: 'separator' }
    );
  }

  if (params.misspelledWord && params.dictionarySuggestions?.length > 0) {
    params.dictionarySuggestions.slice(0, 5).forEach((suggestion) => {
      items.push({
        label: suggestion,
        click: () => win.webContents.replaceMisspelling(suggestion),
      });
    });
    items.push({ type: 'separator' });
  }

  if (items.length > 0 && items[items.length - 1]?.type !== 'separator') {
    items.push({ type: 'separator' });
  }

  items.push({
    label: 'Inspect',
    click: () => win.webContents.inspectElement(params.x, params.y),
  });

  return Menu.buildFromTemplate(items);
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const developMenu = {
    label: 'Develop',
    submenu: [
      { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
      { type: 'separator' },
      { role: 'reload', label: 'Reload' },
      { role: 'forceReload', label: 'Force Reload' },
    ],
  };

  const viewMenu = {
    label: 'View',
    submenu: [
      { role: 'resetZoom', label: 'Reset Zoom' },
      { role: 'zoomIn', label: 'Zoom In' },
      { role: 'zoomOut', label: 'Zoom Out' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Toggle Full Screen' },
    ],
  };

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    viewMenu,
    ...(isDeveloperMode ? [developMenu] : []),
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ role: 'about' }] },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function enableDeveloperMode(win) {
  const wasAlreadyEnabled = isDeveloperMode;
  isDeveloperMode = true;
  if (!wasAlreadyEnabled) {
    createApplicationMenu();
  }
  win.webContents.openDevTools();
  if (!win._contextMenuHandlerAdded) {
    win._contextMenuHandlerAdded = true;
    win.webContents.on('context-menu', (_event, params) => {
      const menu = createChromeContextMenu(win, params);
      menu.popup({ window: win, frame: params.frame });
    });
  }
}

ipcMain.on('enable-developer-mode', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) enableDeveloperMode(win);
});

function createWindow() {
  nativeTheme.themeSource = 'dark';

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'CVinna',
    icon: ICON_PATH,
    // Spotify/Slack-style window: hidden title bar, traffic lights in corner, rounded corners
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    roundedCorners: true,
    show: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.addEventListener("message", (e) => {
        if (e.data?.type === "cvinna:user-flags") {
          console.log(e.data.is_employee, e.data.is_developer);
          if (e.data.is_developer && window.cvinnaAPI?.enableDeveloperMode) {
            window.cvinnaAPI.enableDeveloperMode();
          }
        }
      });
    `);
  });

  if (isDeveloperMode) {
    enableDeveloperMode(mainWindow);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    app.quit();
  });
}

app.setName('CVinna');

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createFromPath(ICON_PATH));
  }
  createApplicationMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
