import { ipcRenderer, contextBridge } from 'electron'

const EVENTS = ['init', 'ready', 'minimize', 'unmaximize', 'maximize', 'relaunch', 'quit', 'openAppsVolume'] as const

contextBridge.exposeInMainWorld('appAPI', {
  ...Object.fromEntries(EVENTS.map(ev => [ev, () => ipcRenderer.invoke(ev)])) as Record<typeof EVENTS[number], () => Promise<void>>,
  init: () => ipcRenderer.sendSync('synchronous-message', 'init'),
  setLanguage: (n: string | null) => ipcRenderer.invoke('setLanguage', n),
  setSystemMediaControlsSession: (n: boolean) => ipcRenderer.invoke('setSystemMediaControlsSession', n),
  setKeybinds: (n: { action: string, bind: number[] }[]) => ipcRenderer.invoke('setKeybinds', n),
  extendMediaSession: () => ipcRenderer.invoke('extendMediaSession'),
  getYTVideoVolume: () => ipcRenderer.invoke('getYTVideoVolume'),
  setYTVideoVolume: (vol: number) => ipcRenderer.invoke('setYTVideoVolume', vol),
  startByeDPI: (port: number) => ipcRenderer.invoke('startByeDPI', port),
  stopByeDPI: () => ipcRenderer.invoke('stopByeDPI'),
  pauseAll: () => ipcRenderer.invoke('pauseAll'),
  resume: (apps: string[]) => ipcRenderer.invoke('resume', apps),
  getLocale: () => ipcRenderer.sendSync('synchronous-message', 'getLocale'),
  on: (ev, cb) => ipcRenderer.on(ev, (_, data) => cb(data))
} as Window['appAPI'])