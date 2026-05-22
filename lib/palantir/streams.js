const { fetchMeta } = require('../cinemeta')
const { parseContentId } = require('../ids')
const { isPalantirConfigured, isMoriaConfigured, getPalantirConfig } = require('./config')
const { fetchLinksByTmdb } = require('./client')
const { fetchLinksFromMoria } = require('./moria')
const { getMoriaMeta } = require('./moriaCatalog')
const { normalizeLink } = require('./parse')

async function getTmdbFromStremio(type, stremioId, userConfig = {}) {
  const { imdbId, tmdbId, season, episode } = parseContentId(stremioId)
  if (tmdbId) {
    const meta = getMoriaMeta(type, tmdbId, getPalantirConfig(userConfig))
    return { tmdb: tmdbId, meta, season, episode }
  }
  const meta = await fetchMeta(type, imdbId)
  const tmdb = meta?.moviedb_id != null ? Number(meta.moviedb_id) : null
  return { tmdb, meta, season, episode }
}

/**
 * Candidatos desde la base de datos moria (SQLite).
 */
async function fetchPalantirCandidates(type, stremioId, options = {}) {
  if (!isPalantirConfigured(options.userConfig)) {
    return []
  }

  try {
    const { tmdb, season, episode, meta } = await getTmdbFromStremio(
      type,
      stremioId,
      options.userConfig
    )
    if (!tmdb) {
      console.warn('[moria] Sin moviedb_id en Cinemeta para', stremioId)
      return []
    }

    const cfg = getPalantirConfig(options.userConfig)
    let links = []

    if (cfg.apiBase && cfg.linksPath) {
      links = await fetchLinksByTmdb(type, tmdb, season, episode, options)
    } else if (isMoriaConfigured(options.userConfig)) {
      const raw = fetchLinksFromMoria(type, tmdb, season, episode, cfg)
      links = raw
        .filter((r) => r.url)
        .map((r) =>
          normalizeLink({
            url: r.url,
            name: r.name,
            quality: r.quality,
          })
        )
      if (links.length === 0 && raw.length > 0) {
        console.warn('[moria] enlaces sin URL descifrada (revisa la BD)')
      }
    }

    console.log(
      `[moria] ${links.length} enlaces para ${meta?.name || stremioId} (tmdb ${tmdb})`
    )
    return links
  } catch (err) {
    console.warn('[moria]', err.message)
    return []
  }
}

module.exports = { fetchPalantirCandidates, getTmdbFromStremio }
