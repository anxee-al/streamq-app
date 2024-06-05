declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

declare module "config" {
  const data: {
    url: string
    updatesUrl: string
  }
  export default data
}

declare module "*/streamq-sysapi.win32-x64-msvc.node" {
  const applyAcrylic: (hwnd: number, color: [number, number, number, number]) => void
  const disableRounds: (hwnd: number) => void
  const sleep: (ms: number) => void
  const initialize: (config: any) => void
  const setKeybinds: (keybinds: { action: string, bind: number[] }[]) => void
  const pauseAll: () => string[]
  const resume: (apps: string[]) => void
  type events = {
    nowPlayingChanged: (_: null, val: { app: string, title: string }) => void
    keybindPressed: (_: null, action: string) => void
    keyDown: (_: null, val: number) => void
    keyUp: (_: null, val: number) => void
    mouseDown: (_: null, val: number) => void
    mouseUp: (_: null, val: number) => void
  }
  const on: <K extends keyof events>(ev: K, cb: (_: null, val: events[K]) => void) => void
}

declare module "*.yml" {
  const data: any
  export default data
}