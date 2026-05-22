/**
 * Adapta respuestas JSON de Palantir al formato de candidatos de Kraken.
 * Ajusta estas funciones si usas PALANTIR_API_BASE (API HTTP opcional).
 */

function pick(obj, paths) {
  for (const path of paths) {
    const parts = path.split('.')
    let cur = obj
    let ok = true
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') {
        ok = false
        break
      }
      cur = cur[p]
    }
    if (ok && cur != null) return cur
  }
  return null
}

function extractLinksArray(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  const nested = pick(data, [
    'links',
    'enlaces',
    'data.links',
    'data.enlaces',
    'result.links',
    'result.enlaces',
    'streams',
    'data',
  ])
  if (Array.isArray(nested)) return nested
  if (nested && typeof nested === 'object') return [nested]
  return []
}

function normalizeLink(item) {
  if (!item || typeof item !== 'object') {
    if (typeof item === 'string') item = { url: item }
    else return null
  }

  const rawUrl = item.url || item.link || item.enlace || item.href || ''
  const magnet =
    item.magnet ||
    (typeof rawUrl === 'string' && rawUrl.startsWith('magnet:') ? rawUrl : null)

  const httpUrl =
    typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl) ? rawUrl : null

  const infoHash =
    item.infoHash ||
    item.info_hash ||
    item.hash ||
    magnet?.match(/btih:([a-fA-F0-9]{40})/i)?.[1]

  const label =
    item.label ||
    item.title ||
    item.name ||
    item.titulo ||
    item.calidad ||
    item.quality ||
    'Palantir'

  if (!magnet && !infoHash && !httpUrl) return null

  return {
    magnet: magnet || (infoHash ? `magnet:?xt=urn:btih:${infoHash}` : null),
    infoHash: infoHash || undefined,
    url: httpUrl && !magnet ? httpUrl : undefined,
    label: String(label).slice(0, 200),
    source: 'Palantir',
    quality: item.calidad || item.quality || item.resolution || '',
    audio: item.audio || item.idioma || '',
  }
}

function extractLinksFromResponse(data) {
  const arr = extractLinksArray(data)
  const out = []
  for (const item of arr) {
    const n = normalizeLink(item)
    if (n) out.push(n)
  }
  return out
}

module.exports = { extractLinksFromResponse, normalizeLink }
