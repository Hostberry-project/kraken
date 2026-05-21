const MAGNET_RE = /magnet:\?xt=urn:btih:[a-fA-F0-9]{40}[^\s"'<>]*/gi
const HASH_RE = /btih:([a-fA-F0-9]{40})/i

const MENU_PATH_RE =
  /\/(?:peliculas|series|series_p|categoria|contacto|ayuda|buscar|page|tag|author|feed)\/?$/i
const WP_ASSET_RE = /\/wp-(?:content|includes|json|admin|plugins|themes)/i

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

function decodeAttrValue(raw) {
  const val = String(raw || '').trim()
  if (!val) return null
  if (/^https?:\/\//i.test(val)) return val
  if (/^[A-Za-z0-9+/]+=*$/.test(val) && val.length >= 12) {
    try {
      const decoded = Buffer.from(val, 'base64').toString('utf8')
      if (/^https?:\/\//i.test(decoded) || /\.torrent/i.test(decoded)) {
        return decoded
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

/** DivxTotal y webs similares: .torrent en data-src (base64) */
function extractEncodedTorrentUrls(html, baseUrl) {
  if (!html) return []
  const urls = new Set()
  const attrRe =
    /data-(?:src|href|url|link|torrent)=["']([^"']+)["']/gi
  let m
  while ((m = attrRe.exec(html)) !== null) {
    const decoded = decodeAttrValue(m[1])
    if (!decoded) continue
    const full = resolveUrl(decoded, baseUrl)
    if (full && (full.includes('.torrent') || /^https?:\/\//i.test(full))) {
      urls.add(full)
    }
  }
  return [...urls]
}

function queryTokens(query) {
  return String(query || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

function scoreDetailUrl(url, tokens) {
  let score = 0
  let path = ''
  try {
    path = new URL(url).pathname.toLowerCase()
  } catch {
    return -1000
  }

  if (WP_ASSET_RE.test(url) || url.includes('telegram')) return -1000
  if (MENU_PATH_RE.test(path)) return -80
  if (/\.torrent/i.test(url)) score += 90
  if (/\/(pelicula|peliculas|serie|series|descargar|torrent|estrenos)/i.test(path)) {
    score += 20
  }

  for (const t of tokens) {
    if (path.includes(t)) score += 45
  }

  const parts = path.split('/').filter(Boolean)
  if (parts.length === 1 && parts[0].length > 2 && !MENU_PATH_RE.test(`/${parts[0]}/`)) {
    score += 35
  }
  if (parts.length >= 2) score += 10

  return score
}

function extractDetailLinks(html, baseUrl, limit = 5, query = '') {
  if (!html) return []
  const host = new URL(baseUrl).hostname
  const tokens = queryTokens(query)
  const scored = new Map()
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

    const s = scoreDetailUrl(full, tokens)
    if (s < 5) continue

    const prev = scored.get(full)
    if (!prev || s > prev) scored.set(full, s)
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url]) => url)
}

function extractTorrentFileUrls(html, baseUrl) {
  if (!html) return []
  const urls = new Set()
  const re = /href=["']([^"']+\.torrent[^"']*)["']/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const full = resolveUrl(m[1], baseUrl)
    if (full) urls.add(full)
  }
  for (const u of extractEncodedTorrentUrls(html, baseUrl)) {
    if (u.includes('.torrent')) urls.add(u)
  }
  return [...urls]
}

function torrentLabelFromUrl(turl) {
  const name = turl.split('/').pop() || 'torrent'
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

function pushTorrentItems(items, urls, source) {
  for (const turl of urls) {
    items.push({
      magnet: null,
      label: torrentLabelFromUrl(turl),
      source,
      torrentUrl: turl,
    })
  }
}

module.exports = {
  extractMagnetsWithLabels,
  extractDetailLinks,
  extractTorrentFileUrls,
  extractEncodedTorrentUrls,
  decodeMagnetName,
  pushTorrentItems,
  HASH_RE,
}
