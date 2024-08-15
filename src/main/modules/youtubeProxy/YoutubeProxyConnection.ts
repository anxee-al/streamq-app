export type YoutubeProxyConnectionDirect = {
  method: 'direct'
}

export type YoutubeProxyConnectionByeDPI = {
  method: 'byeDPI'
  port: number
  args: string
}

export type YoutubeProxyConnectionXray = {
  method: 'xray'
  port: number
  config: string
}

export type YoutubeProxyConnectionProxy = {
  method: 'proxy'
  host: string
  port: number
}

export type YoutubeProxyConnection = {
  direct: YoutubeProxyConnectionDirect
  byeDPI: YoutubeProxyConnectionByeDPI
  xray: YoutubeProxyConnectionXray
  proxy: YoutubeProxyConnectionProxy
}