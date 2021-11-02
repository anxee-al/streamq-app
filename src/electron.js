const { app, BrowserWindow, screen, ipcMain } = require('electron')
const iohook = require('iohook')
const isDev = require('electron-is-dev')

const VER = '0.1'

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: Math.min(1500, screen.getPrimaryDisplay().workAreaSize.width * 0.8),
    height: Math.min(800, screen.getPrimaryDisplay().workAreaSize.height * 0.8),
    minWidth: 600,
    minHeight: 350,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, nodeIntegrationInWorker: true, contextIsolation: false },
    icon: './static/logo.png'
  })
  win.loadURL(isDev ? 'http://localhost:8081/dashboard' : 'https://streameq.xyz/dashboard')
  iohook.start()
  iohook.on('keyup', e => win.webContents.send('keyup', e))
  ipcMain.handle('version', () => VER)
  win.webContents.on('ipc-message', (_, type) => {
    type === 'minimize' && win.minimize()
    type === 'maximize' && (win.isMaximized() ? win.unmaximize() : win.maximize())
    type === 'close' && win.close()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})