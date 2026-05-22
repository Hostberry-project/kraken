const { request } = require('../fetch')
const { getPalantirConfig, fillPath } = require('./config')
const { extractLinksFromResponse } = require('./parse')

function buildAuthHeaders(cfg) {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
  if (!cfg.apiKey) return headers

  if (cfg.authHeader.toLowerCase() === 'query') return headers

  const prefix = cfg.authPrefix || ''
  headers[cfg.authHeader] = `${prefix}${cfg.apiKey}`.trim()
  return headers
}

function buildUrl(cfg, pathTemplate, params) {
  const path = fillPath(pathTemplate, params)
  const url = new URL(path.startsWith('http') ? path : `${cfg.apiBase}${path}`)
  if (cfg.apiKey && cfg.authHeader.toLowerCase() === 'query') {
    url.searchParams.set('token', cfg.apiKey)
  }
  return url.toString()
}

async function palantirRequest(url, cfg, proxyMeta = {}) {
  const res = await request(
    url,
    { headers: buildAuthHeaders(cfg), method: 'GET' },
    { timeoutMs: cfg.timeoutMs, useProxy: proxyMeta.useProxy === true }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('json')) return res.json()
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Respuesta no JSON; revisa cifrado o PALANTIR_LINKS_PATH')
  }
}

/**
 * Obtiene enlaces vía API HTTP externa (TMDB id).
 * @returns {Promise<import('./parse').normalizeLink[]>}
 */
async function fetchLinksByTmdb(type, tmdbId, season, episode, options = {}) {
  const cfg = getPalantirConfig(options.userConfig)
  if (!cfg.apiBase || !cfg.linksPath) {
    return []
  }

  const params = {
    type: type === 'series' ? 'series' : 'movie',
    tmdb: tmdbId,
    season: season ?? '',
    episode: episode ?? '',
  }

  const url = buildUrl(cfg, cfg.linksPath, params)
  console.log(`[moria-api] GET ${url.replace(cfg.apiKey || '', '***')}`)

  const data = await palantirRequest(url, cfg, options.proxyMeta)
  return extractLinksFromResponse(data)
}

module.exports = { fetchLinksByTmdb }
