import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { MODULES_DIR } from '../constants'
import path from 'path'
import fs from 'fs/promises'

const BYEDPI_DIR = path.join(MODULES_DIR, 'byedpi')

class ByeDPI {
  process: ChildProcess | null
  async start(window: BrowserWindow, port: number, args: string) {
    if (this.process) await this.stop(window)
    return new Promise<void>((res, rej) => {
      this.process = spawn(path.join(BYEDPI_DIR, 'ciadpi.exe'), ['-i', '127.0.0.1', '-p', String(port), ...args.split(' ')])
      this.process.stdout.on('data', (data) => console.log(`byedpi: ${data}`))
      this.process.stderr.on('data', (data) => console.error(`byedpi: ${data}`))
      this.process.on('spawn', async () => {
        try {
          await window.webContents.session.setProxy({
            pacScript: 'data:text/plain;base64,' + Buffer.from(
              Buffer.from(await fs.readFile(path.join(BYEDPI_DIR, 'proxy.pac'), 'utf8'), 'utf8')
                .toString('utf8')
                .replace('{PORT}', String(port))
            ).toString('base64')
          })
        } catch (err) { rej(err) }
        res()
      })
      this.process.on('error', this.onExit)
      this.process.on('exit', this.onExit)
    })
  }
  async stop(window: BrowserWindow) {
    await window.webContents.session.setProxy({})
    this.stopProcess()
    console.log('byedpi: stopped')
  }
  stopProcess() {
    this.process?.kill('SIGTERM')
    this.process = null
    console.log('stop')
  }
  onExit(err?: any) {
    if (!err) return
    console.log('byedpi error:', err)
    throw err
  }
}

export const byeDPI = new ByeDPI