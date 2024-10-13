// eslint-disable-next-line import/no-unresolved
import sysapi from '@napi/streamq-sysapi/streamq-sysapi.win32-x64-msvc.node'
import { BrowserWindow } from 'electron'

export class YoutubeUtils {
  playerRequestsMap = new Set
  loudnessDbByVideo = new Map
  constructor(private window: BrowserWindow) {
    this.window.webContents.debugger.attach('1.3')
    this.window.webContents.debugger.on('message', async (_, method, params) => {
      if (method === 'Target.attachedToTarget') {
        this.window.webContents.debugger.sendCommand('Network.enable')
      }
      if (method === 'Network.responseReceived' && params.response) {
        const url = new URL(params.response.url)
        if (url.host.endsWith('youtube.com') && url.pathname === '/youtubei/v1/player') {
          this.playerRequestsMap.add(params.requestId)
          console.log('[youtube-parser] Request added', params.requestId, params.response.url)
        }
      }
      if (method === 'Network.loadingFinished' && this.playerRequestsMap.has(params.requestId)) {
        console.log('[youtube-parser] Response data received for', params.requestId)
        await new Promise(res => setTimeout(res))
        this.window.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId })
          .then(res => {
            try {
              const data = JSON.parse(res.body)
              this.loudnessDbByVideo.set(data.videoDetails.videoId, data.playerConfig.audioConfig.loudnessDb)
              console.log('[youtube-parser] LoudnessDB extracted', data.videoDetails.videoId, data.playerConfig.audioConfig.loudnessDb)
            } catch (err) {
              console.error(`[youtube-parser] Failed to parse response body for ${params.requestId}:`, err)
            }
          })
          .catch(err => console.error(`[youtube-parser] Error fetching response body for ${params.requestId}:`, err))
          .finally(() => this.playerRequestsMap.delete(params.requestId))
      }
    })
    this.window.webContents.debugger.sendCommand('Network.enable')
  }
  getVideoLoudnessDB(videoId: string) {
    return this.loudnessDbByVideo.get(videoId) ?? null
  }
  setVideoVolume (vol: number) {
    this.window.webContents.mainFrame.frames
      .find(frame => frame.origin === 'https://www.youtube.com')
      ?.executeJavaScript(`document.querySelector(\'video\').volume = ${vol}`)
  }
  setPiPMode(isActive: boolean, isOnTop: boolean) {
    this.window.webContents.mainFrame.frames
      .find(frame => frame.origin === 'https://www.youtube.com')
      ?.executeJavaScript(isActive ? `
        document.getElementsByTagName('video')[0].requestPictureInPicture()
        if (!window.streamqLeavePiPListener) window.streamqLeavePiPListener = () => window.parent.postMessage('streamq:leavepictureinpicture', '*')
        document.getElementsByTagName('video')[0].removeEventListener('leavepictureinpicture', window.streamqLeavePiPListener)
        document.getElementsByTagName('video')[0].addEventListener('leavepictureinpicture', window.streamqLeavePiPListener)
      ` : 'document.exitPictureInPicture()', true).then(() => isActive && sysapi.setPipAlwaysOnTopMode(isOnTop))
  }
  setPiPAlwaysOnTopMode(isOnTop: boolean) {
    sysapi.setPipAlwaysOnTopMode(isOnTop)
  }
}