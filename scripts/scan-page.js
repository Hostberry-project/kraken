const fs = require('fs')
const { fetchText } = require('../lib/http')
const url = process.argv[2]
const out = process.argv[3] || 'scan-out.txt'
fetchText(url).then((h) => {
  if (!h) return fs.writeFileSync(out, 'NO HTML')
  const lines = []
  for (const kw of ['magnet', 'btih', 'torrent', 'descargar', 'download', 'alldebrid', 'real-debrid', 'href="http']) {
    let i = 0
    while ((i = h.toLowerCase().indexOf(kw, i)) !== -1 && lines.length < 40) {
      lines.push(h.slice(Math.max(0, i - 40), i + 120).replace(/\s+/g, ' '))
      i += kw.length
    }
  }
  fs.writeFileSync(out, lines.join('\n---\n'))
  console.log('lines', lines.length, '->', out)
})
