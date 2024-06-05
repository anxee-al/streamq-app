import { app, BrowserWindow } from 'electron'
import { bootstrapWindow } from './app/bootstrap'
import { settings } from './settings'
import path from 'path'

console.log(`${app.getName()} ${app.getVersion()}`)

if (!settings.data.systemMediaControlsSession) {
  console.log(settings.data.systemMediaControlsSession)
  app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService')
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('streamq', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('streamq')
}

const createWindow = (): void => {
  if (!app.requestSingleInstanceLock()) return app.quit()
  bootstrapWindow.init()
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})