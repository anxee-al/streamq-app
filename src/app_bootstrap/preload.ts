import { ipcRenderer, contextBridge } from 'electron'
import { YoutubeProxyConnection } from '../main/modules/youtubeProxy/YoutubeProxyConnection'

const EVENTS = ['init', 'ready', 'minimize', 'unmaximize', 'maximize', 'relaunch', 'quit', 'openAppsVolume'] as const

contextBridge.exposeInMainWorld('appAPI', {
  ...Object.fromEntries(EVENTS.map(ev => [ev, () => ipcRenderer.invoke(ev)])) as Record<typeof EVENTS[number], () => Promise<void>>,
  init: () => ipcRenderer.sendSync('synchronous-message', 'init'),
  setLanguage: (n: string | null) => ipcRenderer.invoke('setLanguage', n),
  setSystemMediaControlsSession: (isActive: boolean) => ipcRenderer.invoke('setSystemMediaControlsSession', isActive),
  setKeybinds: (n: { action: string, bind: number[] }[]) => ipcRenderer.invoke('setKeybinds', n),
  extendMediaSession: () => ipcRenderer.invoke('extendMediaSession'),
  getYTVideoLoudnessDB: (videoId: string) => ipcRenderer.invoke('getYTVideoLoudnessDB', videoId),
  setYTVideoVolume: (vol: number) => ipcRenderer.invoke('setYTVideoVolume', vol),
  setYoutubeConnectionMethod: (connection: YoutubeProxyConnection[keyof YoutubeProxyConnection]) => ipcRenderer.invoke('setYoutubeConnectionMethod', connection),
  setYoutubePiPMode: (isActive: boolean, isOnTop: boolean) => ipcRenderer.invoke('setYoutubePiPMode', isActive, isOnTop),
  setYoutubePiPAlwaysOnTopMode: (isOnTop: boolean) => ipcRenderer.invoke('setYoutubePiPAlwaysOnTopMode', isOnTop),
  pauseAll: () => ipcRenderer.invoke('pauseAll'),
  resume: (apps: string[]) => ipcRenderer.invoke('resume', apps),
  getLocale: () => ipcRenderer.sendSync('synchronous-message', 'getLocale'),
  on: (ev, cb) => ipcRenderer.on(ev, (_, data) => cb(data))
} as Window['appAPI'])