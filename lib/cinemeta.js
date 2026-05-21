const config = require('../config')
const cache = require('./cache')
const { request } = require('./fetch')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function parseStremioId(id) {
  const parts = String(id).split(':')
  return {
    imdbId: parts[0],
    season: parts[1] ? parseInt(parts[1], 10) : null,
    episode: parts[2] ? parseInt(parts[2], 10) : null,
  }
}

async function fetchMeta(type, imdbId) {
  const cacheKey = `meta:${type}:${imdbId}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`
  const res = await request(
    url,
    { headers: { 'User-Agent': UA } },
    { useProxy: config.proxy?.useForCinemeta === true }
  )
  if (!res.ok) return null
  const data = await res.json()
  const meta = data.meta || null
  if (meta) cache.set(cacheKey, meta, config.cacheTtlMs)
  return meta
}

function buildSearchQuery(meta, type, season, episode) {
  if (!meta || !meta.name) return null

  const year = meta.year || meta.released?.slice(0, 4) || ''
  let query = meta.name

  if (type === 'series' && season != null && episode != null) {
    const padS = String(season).padStart(2, '0')
    const padE = String(episode).padStart(2, '0')
    query = `${meta.name} ${season}x${episode}`
    query += ` S${padS}E${padE}`
  } else if (year) {
    query = `${meta.name} ${year}`
  }

  return query.trim()
}

async function getSearchQuery(type, stremioId) {
  const { imdbId, season, episode } = parseStremioId(stremioId)
  const meta = await fetchMeta(type, imdbId)
  const query = buildSearchQuery(meta, type, season, episode)
  return { query, meta, imdbId, season, episode }
}

module.exports = { getSearchQuery, parseStremioId, fetchMeta, buildSearchQuery }
