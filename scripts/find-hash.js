const fs = require('fs')
const { fetchText } = require('../lib/http')
const url = process.argv[2]
fetchText(url).then((h) => {
  if (!h) return console.log('no html')
  const btih = (h.match(/btih:[a-f0-9]{40}/gi) || []).length
  const magnet = (h.match(/magnet:\?/gi) || []).length
  const torrent = (h.match(/\.torrent/gi) || []).length
  const hex40 = (h.match(/\b[a-f0-9]{40}\b/gi) || []).length
  console.log({ btih, magnet, torrent, hex40, len: h.length })

  const patterns = [
    /data-(?:url|href|link)=["']([^"']+)["']/gi,
    /window\.open\(["']([^"']+)["']/gi,
    /location\.href\s*=\s*["']([^"']+)["']/gi,
  ]
  for (const re of patterns) {
    const found = []
    let m
    while ((m = re.exec(h)) && found.length < 5) found.push(m[1])
    if (found.length) console.log(re.source.slice(0, 30), found)
  }

  const hrefs = []
  const hrefRe = /href=["']([^"']+)["']/gi
  let m
  while ((m = hrefRe.exec(h))) {
    const u = m[1]
    if (/descarg|torrent|magnet|download|go\.|redirect|enlace/i.test(u)) hrefs.push(u)
  }
  if (hrefs.length) console.log('download hrefs:', hrefs.slice(0, 10))
})
