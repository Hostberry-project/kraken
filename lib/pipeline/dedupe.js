const HASH_RE = /btih:([a-fA-F0-9]{40})/i

function infoHashFromMagnet(magnet) {
  const m = String(magnet).match(HASH_RE)
  return m ? m[1].toLowerCase() : null
}

function dedupeCandidates(candidates) {
  const seen = new Set()
  const out = []

  for (const c of candidates) {
    const hash = infoHashFromMagnet(c.magnet)
    const key = hash || c.magnet
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...c, infoHash: hash })
  }

  return out
}

module.exports = { dedupeCandidates, infoHashFromMagnet }
