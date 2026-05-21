const os = require('os')

/** URLs del manifest en interfaces LAN (útil en Linux con Stremio en el mismo equipo). */
function getLanUrls(port) {
  const urls = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        urls.push(`http://${iface.address}:${port}/manifest.json`)
      }
    }
  }
  return [...new Set(urls)]
}

module.exports = { getLanUrls }
