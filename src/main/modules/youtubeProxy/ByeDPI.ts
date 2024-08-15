import { spawn, ChildProcess } from 'child_process'
import { MODULES_DIR } from '../../constants'
import { YoutubeProxyConnectionByeDPI } from './YoutubeProxyConnection'
import path from 'path'

export class ByeDPI {
  process: ChildProcess | null
  async start({ port, args }: YoutubeProxyConnectionByeDPI) {
    return new Promise<void>((res, rej) => {
      const onExit = (err?: any) => {
        if (!err) return
        console.log('byedpi error:', err)
        rej(err)
      }
      this.process = spawn(path.join(MODULES_DIR, 'proxy', 'ciadpi.exe'), ['-i', '127.0.0.1', '-p', String(port), ...args.split(' ')])
      this.process.stdout.on('data', (data) => console.log(`byedpi: ${data}`))
      this.process.stderr.on('data', (data) => console.error(`byedpi: ${data}`))
      this.process.on('spawn', res)
      this.process.on('error', onExit)
      this.process.on('exit', onExit)
    })
  }
  stop() {
    this.process?.kill('SIGTERM')
    this.process = null
    console.log('byedpi: stopped')
  }
}