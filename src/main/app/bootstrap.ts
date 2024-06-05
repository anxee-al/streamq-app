import { app, ipcMain } from 'electron'
import { AcrylicBrowserWindow } from '../utils/AcrylicBrowserWindow'
import { mainWindow } from './main'
import { NsisUpdater } from 'electron-updater'
import { settings } from '../settings'
import isDev from 'electron-is-dev'
import config from 'config'

type LoadingStatus = 'checking-for-update' | 'downloading' | 'updating' | 'starting'

class BootstrapWindow {
  window: AcrylicBrowserWindow | null = null
  init() {
    this.window = new AcrylicBrowserWindow({
      width: 440,
      height: 200,
      autoHideMenuBar: true,
      show: false,
      resizable: isDev,
      webPreferences: { preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY }
    })
    ipcMain.on('synchronous-message', (event, arg) => {
      if (arg === 'init') event.returnValue = this.handlers.init()
    })
    ipcMain.handleOnce('ready', this.handlers.ready)
    this.window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).then(() => this.window.show())
  }
  handlers = {
    init: () => ({ version: app.getVersion(), settings: settings.data }),
    ready: () => this.update()
  }
  setStatus(n: LoadingStatus) {
    this.window!.webContents.send('status', n)
  }
  async update() {
    return new Promise<null>((res, rej) => {
      this.setStatus('checking-for-update')
      const updater = new NsisUpdater({ provider: 'generic', url: config.updatesUrl })
      updater.logger = console
      updater.on('error', () => setTimeout(() => updater.checkForUpdates().catch(console.error), 5000))
      updater.on('update-available', () => this.setStatus('downloading'))
      updater.on('download-progress', p => {
        console.log('[updater] Download progress', p)
        this.window.webContents.send('progress', p.percent)
      })
      updater.on('update-cancelled', rej)
      updater.on('update-not-available', () => res(null))
      updater.on('update-downloaded', () => {
        this.setStatus('updating')
        updater.quitAndInstall(true, true)
      })
      if (isDev) return res(null)
      updater.checkForUpdates().catch(console.error)
    }).then(() => mainWindow.init())
  }
}

export const bootstrapWindow = new BootstrapWindow