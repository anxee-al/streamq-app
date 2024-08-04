const proxyDomains = [
  'youtube.com',
  'ytimg.com',
  'google.com',
  'googleapis.com',
  'googlevideo.com',
  'ggpht.com'
]

function FindProxyForURL(_url, host) {
  if (proxyDomains.find(p => dnsDomainIs(host, p) || shExpMatch(host, '*.' + p)))
    return 'SOCKS5 localhost:{PORT}'
  return 'DIRECT'
}