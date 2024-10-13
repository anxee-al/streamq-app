import { IpcMainInvokeEvent, app, dialog, ipcMain, screen, session, shell } from 'electron'
import { AcrylicBrowserWindow } from '../utils/AcrylicBrowserWindow'
import { bootstrapWindow } from './bootstrap'
import { settings } from '../settings'
import { YoutubeUtils } from '../modules/youtubeUtils/YoutubeUtils'
import { YoutubeProxy } from '../modules/youtubeProxy/YoutubeProxy'
import { YoutubeProxyConnection } from '../modules/youtubeProxy/YoutubeProxyConnection'
import windowStateKeeper from 'electron-window-state'
import isDev from 'electron-is-dev'
import config from 'config'

// eslint-disable-next-line import/no-unresolved
import sysapi from '@napi/streamq-sysapi/streamq-sysapi.win32-x64-msvc.node'

class MainWindow {
  window: AcrylicBrowserWindow
  youtubeProxy: YoutubeProxy
  youtubeUtils: YoutubeUtils
  isLoaded = false
  isInitialized = false
  isMaximized = false
  instanceEvents: Record<string, (args: Record<string, string>) => void> = {
    auth: ({ code }: { code: string }) => this.window.webContents.send('auth', code)
  }
  async init() {
    bootstrapWindow.setStatus('starting')
    const height = ~~Math.min(800, screen.getPrimaryDisplay().workAreaSize.height / 1.2)
    const { isMaximized, ...windowState } = windowStateKeeper({
      defaultWidth: ~~Math.min(height * 1.8, screen.getPrimaryDisplay().workAreaSize.width - 20),
      defaultHeight: height,
      maximize: false
    })
    this.isMaximized = isMaximized
    this.window = new AcrylicBrowserWindow({
      ...windowState,
      autoHideMenuBar: true,
      show: false,
      webPreferences: { preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY }
    })
    this.youtubeUtils = new YoutubeUtils(this.window)
    this.youtubeProxy = new YoutubeProxy(this.window)
    app.on('before-quit', () => this.youtubeProxy.stop())
    ipcMain.on('synchronous-message', (event, arg) => {
      if (arg === 'init') event.returnValue = this.handlers.init()
    })
    ipcMain.handle('setLanguage', this.handlers.setLanguage)
    ipcMain.handle('setSystemMediaControlsSession', this.handlers.setSystemMediaControlsSession)
    ipcMain.handle('setKeybinds', this.handlers.setKeybinds)
    ipcMain.handle('extendMediaSession', this.handlers.extendMediaSession)
    ipcMain.handle('getYTVideoLoudnessDB', this.handlers.getYTVideoLoudnessDB)
    ipcMain.handle('setYTVideoVolume', this.handlers.setYTVideoVolume)
    ipcMain.handle('pauseAll', this.handlers.pauseAll)
    ipcMain.handle('resume', this.handlers.resume)
    ipcMain.handle('openAppsVolume', this.handlers.openAppsVolume)
    ipcMain.handle('setYoutubeConnectionMethod', this.handlers.setYoutubeConnectionMethod)
    ipcMain.handle('setYoutubePiPMode', this.handlers.setYoutubePiPMode)
    ipcMain.handle('setYoutubePiPAlwaysOnTopMode', this.handlers.setYoutubePiPAlwaysOnTopMode)
    ipcMain.handle('minimize', this.handlers.minimize)
    ipcMain.handle('unmaximize', this.handlers.unmaximize)
    ipcMain.handle('maximize', this.handlers.maximize)
    ipcMain.handle('relaunch', this.handlers.relaunch)
    ipcMain.handle('quit', this.handlers.quit)
    windowState.manage(this.window)

    this.window.webContents.setWindowOpenHandler(details => {
      if (details.features.includes('internal=true')) return { action: 'allow' }
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    this.window.webContents.on('did-navigate', (_, __, statusCode) => statusCode === 200 && (this.isLoaded = true))

    app.on('second-instance', (_, argv) => {
      if (!this.window) return
      if (this.window.isMinimized()) this.window.restore()
      this.window.focus()
      if (argv.at(-1)?.startsWith('streamq://')) {
        const url = new URL(argv.at(-1))
        const params = Object.fromEntries([...url.searchParams.entries()])
        console.log(`[second-instance] hostname: ${url.hostname} | params: ${{ ...params, ...params.code ? { code: '[hidden]' } : {} }}`)
        this.instanceEvents[url.hostname as keyof typeof this.instanceEvents]?.(params)
      }
    })

    this.load()
  }
  load() {
    this.window.loadURL(config.url, { extraHeaders : 'Cache-Control: no-cache' })
      .then(async () => {
        if (!this.isLoaded) return this.retry()
        this.start()
      })
      .catch(async e => {
        console.log('URL loading error', e)
        this.retry()
      })
  }
  start() {
    this.window.on('maximize', () => this.window.webContents.send('updateIsMaximized', true))
    this.window.on('unmaximize', () => this.window.webContents.send('updateIsMaximized', false))
    bootstrapWindow.window!.close()
    this.window.show()
    if (this.isMaximized) this.window.maximize()
  }
  async retry() {
    setTimeout(() => this.load(), 5000)
  }
  handlers = {
    init: () => {
      if (!this.isInitialized) {
        this.isInitialized = true
        sysapi.on('nowPlayingChanged', (_, c) => (console.log('[now-playing]', c), this.window.webContents.send('nowPlayingChanged', c ?? null)))
        sysapi.on('keybindPressed', (_, action) => this.window.webContents.send('keybindPressed', action))
        sysapi.initialize({ debug: isDev || process.argv.includes('--debug'), keybinds: [] })
      }
      return {
        version: app.getVersion(),
        isMaximized: this.window.isMaximized(),
        settings: settings.data
      }
    },
    setLanguage: (_: IpcMainInvokeEvent, lang: 'en' | 'ru' | null) => settings.set('language', lang),
    setSystemMediaControlsSession: (_: IpcMainInvokeEvent, isActive: boolean) => settings.set('systemMediaControlsSession', isActive),
    setKeybinds: (_: IpcMainInvokeEvent, keybinds: { action: string, bind: number[] }[]) => sysapi.setKeybinds(keybinds),
    extendMediaSession: () => this.window.webContents.mainFrame.frames.forEach(f => f.executeJavaScript(`
      class MediaMetadata extends window.MediaMetadata {
        constructor(data) {
          super(data)
          setTimeout(() => {
            navigator.mediaSession.setActionHandler('previoustrack', () => window.parent.postMessage('streamq:previous', '*'))
            navigator.mediaSession.setActionHandler('nexttrack', () => window.parent.postMessage('streamq:next', '*'))
          })
        }
      }
    `)),
    getYTVideoLoudnessDB: (_: IpcMainInvokeEvent, videoId: string) => this.youtubeUtils.getVideoLoudnessDB(videoId),
    setYTVideoVolume: (_: IpcMainInvokeEvent, vol: number) => this.youtubeUtils.setVideoVolume(vol),
    pauseAll: () => sysapi.pauseAll(),
    resume: (_: IpcMainInvokeEvent, apps: string[]) => sysapi.resume(apps),
    openAppsVolume: () => shell.openExternal('ms-settings:apps-volume'),
    setYoutubeConnectionMethod: (_: IpcMainInvokeEvent, connection: YoutubeProxyConnection[keyof YoutubeProxyConnection]) =>
      this.youtubeProxy.set(connection).catch(err => dialog.showErrorBox('Proxy Error', String(err))),
    setYoutubePiPMode: (_: IpcMainInvokeEvent, isActive: boolean, isOnTop: boolean) => this.youtubeUtils.setPiPMode(isActive, isOnTop),
    setYoutubePiPAlwaysOnTopMode: (_: IpcMainInvokeEvent, isOnTop: boolean) => this.youtubeUtils.setPiPAlwaysOnTopMode(isOnTop),
    minimize: () => this.window.minimize(),
    unmaximize: () => this.window.unmaximize(),
    maximize: () => this.window.maximize(),
    relaunch: () => {
      if (!isDev) app.relaunch()
      app.exit()
    },
    quit: () => app.quit()
  }
}

export const mainWindow = new MainWindow