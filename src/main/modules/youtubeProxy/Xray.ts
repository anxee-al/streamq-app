import { app } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { MODULES_DIR } from '../../constants'
import { YoutubeProxyConnectionXray } from './YoutubeProxyConnection'
import path from 'path'
import fs from 'fs/promises'

const CONFIG_FILE = path.join(app.getPath('userData'), 'xray-client.json')

export class Xray {
  process: ChildProcess | null
  async start({ port, config }: YoutubeProxyConnectionXray) {
    await fs.writeFile(CONFIG_FILE, config.replace('{PORT}', String(port)))
    return new Promise<void>((res, rej) => {
      const onExit = (err?: any) => {
        if (!err) return
        console.log('xray error:', err)
        rej(err)
      }
      this.process = spawn(path.join(MODULES_DIR, 'proxy', 'xray.exe'), ['-c', CONFIG_FILE])
      this.process.stdout.on('data', (data) => console.log(`xray: ${data}`))
      this.process.stderr.on('data', (data) => console.error(`xray: ${data}`))
      this.process.on('spawn', res)
      this.process.on('error', onExit)
      this.process.on('exit', onExit)
    })
  }
  stop() {
    this.process?.kill('SIGTERM')
    this.process = null
    console.log('xray: stopped')
  }
}