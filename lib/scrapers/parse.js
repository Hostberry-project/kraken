const MAGNET_RE = /magnet:\?xt=urn:btih:[a-fA-F0-9]{40}[^\s"'<>]*/gi
const HASH_RE = /btih:([a-fA-F0-9]{40})/i

function decodeMagnetName(magnet) {
  const dn = magnet.match(/dn=([^&]+)/i)
  if (!dn) return ''
  try {
    return decodeURIComponent(dn[1].replace(/\+/g, ' '))
  } catch {
    return dn[1]
  }
}

function extractMagnetsWithLabels(html) {
  if (!html) return []
  const found = html.match(MAGNET_RE) || []
  const unique = [...new Set(found.map((m) => m.trim()))]
  return unique.map((magnet) => ({
    magnet,
    label: decodeMagnetName(magnet) || magnet.slice(0, 80),
  }))
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

function extractDetailLinks(html, baseUrl, limit = 5) {
  if (!html) return []
  const host = new URL(baseUrl).hostname
  const links = new Set()
  const hrefRe = /href=["']([^"']+)["']/gi
  let m

  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1]
    if (
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.includes('telegram')
    ) {
      continue
    }

    const full = resolveUrl(href, baseUrl)
    if (!full || !full.includes(host)) continue

    const lower = full.toLowerCase()
    const looksRelevant =
      lower.includes('.torrent') ||
      /\/(pelicula|serie|series|descargar|torrent|peliculas|estrenos)/i.test(
        lower
      )

    if (looksRelevant) links.add(full)
    if (links.size >= limit) break
  }

  return [...links]
}

function extractTorrentFileUrls(html, baseUrl) {
  if (!html) return []
  const urls = []
  const re = /href=["']([^"']+\.torrent[^"']*)["']/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const full = resolveUrl(m[1], baseUrl)
    if (full) urls.push(full)
  }
  return [...new Set(urls)]
}

module.exports = {
  extractMagnetsWithLabels,
  extractDetailLinks,
  extractTorrentFileUrls,
  decodeMagnetName,
  HASH_RE,
}
