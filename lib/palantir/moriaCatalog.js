/**
 * Catálogo y búsqueda en moria (SQLite).
 */
const { openDb } = require('./moria')
const { getPalantirConfig, isMoriaConfigured } = require('./config')

const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original'
const PAGE_SIZE = 100

function escapeLike(q) {
  return String(q).replace(/[%_\\]/g, '\\$&')
}

function posterUrl(path) {
  if (!path) return undefined
  const p = String(path).trim()
  if (!p) return undefined
  if (/^https?:\/\//i.test(p)) return p
  return `${TMDB_POSTER}${p.startsWith('/') ? p : `/${p}`}`
}

function rowToMeta(row, type) {
  const tmdb = row.tmdb
  const year = row.fecha ? String(row.fecha).slice(0, 4) : ''
  const meta = {
    id: `tmdb:${tmdb}`,
    type,
    name: row.titulo || `TMDB ${tmdb}`,
    releaseInfo: year || undefined,
    poster: posterUrl(row.poster),
    posterShape: 'poster',
    description: row.plot ? String(row.plot).slice(0, 500) : undefined,
  }
  const banner = row.fondo ? posterUrl(row.fondo) : null
  if (banner) meta.background = banner.replace('/w500', '/original') || `${TMDB_BACKDROP}${row.fondo}`
  if (row.rating != null && row.rating !== '') {
    meta.imdbRating = String(row.rating)
  }
  return meta
}

function searchTable(db, table, type, query, skip = 0) {
  const like = `%${escapeLike(query)}%`
  const sql = `
    SELECT tmdb, titulo, plot, poster, fondo, fecha, rating
    FROM ${table}
    WHERE titulo LIKE ? ESCAPE '\\'
    ORDER BY fecha DESC, titulo COLLATE NOCASE
    LIMIT ? OFFSET ?
  `
  return db.prepare(sql).all(like, PAGE_SIZE, skip)
}

function feedTable(db, table, type, skip = 0) {
  const sql = `
    SELECT tmdb, titulo, plot, poster, fondo, fecha, rating
    FROM ${table}
    ORDER BY fecha DESC, updated DESC
    LIMIT ? OFFSET ?
  `
  return db.prepare(sql).all(PAGE_SIZE, skip)
}

/**
 * @returns {{ metas: object[], cacheMaxAge?: number }}
 */
function searchMoriaCatalog(type, extra = {}, userConfig = {}) {
  if (!isMoriaConfigured(userConfig)) {
    return { metas: [] }
  }

  const db = openDb(getPalantirConfig(userConfig))
  if (!db) {
    console.warn('[moria] instala better-sqlite3 o define PALANTIR_MORIA_DB')
    return { metas: [] }
  }

  try {
    const table = type === 'series' ? 'series' : 'pelis'
    const skip = Math.max(0, parseInt(extra.skip, 10) || 0)
    const q = extra.search ? String(extra.search).trim() : ''

    const rows = q.length >= 2
      ? searchTable(db, table, type, q, skip)
      : feedTable(db, table, type, skip)

    const metas = rows.map((r) => rowToMeta(r, type))
    if (q) console.log(`[moria] búsqueda "${q}" (${type}): ${metas.length} resultados`)

    return { metas, cacheMaxAge: 300 }
  } finally {
    db.close()
  }
}

function getMoriaMeta(type, tmdbId, userConfig = {}) {
  if (!isMoriaConfigured(userConfig)) return null
  const db = openDb(getPalantirConfig(userConfig))
  if (!db) return null
  try {
    const table = type === 'series' ? 'series' : 'pelis'
    const row = db
      .prepare(
        `SELECT tmdb, titulo, plot, poster, fondo, fecha, rating FROM ${table} WHERE tmdb = ?`
      )
      .get(tmdbId)
    return row ? rowToMeta(row, type) : null
  } finally {
    db.close()
  }
}

function getMoriaTitle(type, tmdbId, userConfig = {}) {
  const meta = getMoriaMeta(type, tmdbId, userConfig)
  return meta?.name || null
}

module.exports = {
  searchMoriaCatalog,
  getMoriaMeta,
  getMoriaTitle,
  rowToMeta,
}
