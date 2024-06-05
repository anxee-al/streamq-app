import { BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'

// eslint-disable-next-line import/no-unresolved
import sysapi from '@napi/streamq-sysapi/streamq-sysapi.win32-x64-msvc.node'

export class AcrylicBrowserWindow extends BrowserWindow {
  lastResize = 0
  constructor(options: BrowserWindowConstructorOptions) {
    super({ ...options, frame: false, backgroundColor: '#00000000' })
    const hwnd = this.getNativeWindowHandle().readInt32LE(0)
    sysapi.applyAcrylic(hwnd, [0, 0, 0, 0])
    sysapi.disableRounds(hwnd)
    this.on('will-move', () => sysapi.sleep(1000 / screen.getPrimaryDisplay().displayFrequency))
    this.on('will-resize', (e) => {
      if (this.lastResize >= Date.now() - 1000 / screen.getPrimaryDisplay().displayFrequency * 2) e.preventDefault()
      else this.lastResize = Date.now()
    })
  }
}