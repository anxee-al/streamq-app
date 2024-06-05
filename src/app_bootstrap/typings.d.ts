type Settings = {
  language: 'en' | 'ru' | null
}
type Config = {
  version: string
  settings: Settings
}

type Events = {
  status: string
  progress: string
  nowPlayingChanged: boolean
  keyDown: number
  keyUp: number
  mouseDown: number
  mouseUp: number
  log: any
}

declare interface Window {
  appAPI: {
    init: () => Config
    ready: () => Promise<void>
    on: <K extends keyof Events> (ev: K, cb: (data: Events[K]) => void) => void
  }
}

declare module "*.sass"