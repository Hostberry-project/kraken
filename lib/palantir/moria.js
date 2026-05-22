/**
 * Lectura de enlaces desde moria (SQLite embebido en moria_*.zm3 de GitHub).
 * Requiere better-sqlite3 o ruta a DB ya extraída (PALANTIR_MORIA_DB).
 */
const fs = require('fs')
const path = require('path')
const { decryptPalantirLink } = require('./decrypt')
const { resolveMoriaDbPath, resolveMoriaZm3Path } = require('./moriaPaths')

const ZIP_PREFIX = Buffer.from(
  'UEsDBBQAAAAIAKJchVngR+RlsfTRAQBwSwUMAAAAc2V0dGluZ3MueG1s',
  'base64'
)

function extractMoriaDb(zm3Path, outPath) {
  const AdmZip = tryRequire('adm-zip')
  if (!AdmZip) {
    throw new Error('Instala adm-zip: npm i adm-zip')
  }
  const raw = fs.readFileSync(zm3Path)
  const zip = new AdmZip(Buffer.concat([ZIP_PREFIX, raw]))
  const entry = zip.getEntry('settings.xml')
  if (!entry) throw new Error('settings.xml no encontrado en zm3')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, entry.getData())
  return outPath
}

function tryRequire(name) {
  try {
    return require(name)
  } catch {
    return null
  }
}

function openDb(userConfig = {}) {
  const Database = tryRequire('better-sqlite3')
  if (!Database) return null

  let dbPath =
    userConfig.moriaDb ||
    process.env.PALANTIR_MORIA_DB ||
    resolveMoriaDbPath()
  if (!dbPath || !fs.existsSync(dbPath)) {
    const zm3 =
      userConfig.moriaZm3 || process.env.PALANTIR_MORIA_ZM3 || resolveMoriaZm3Path()
    if (!zm3 || !fs.existsSync(zm3)) return null
    dbPath =
      process.env.FLY_APP_NAME
        ? '/data/moria.db'
        : path.join(path.dirname(zm3), 'moria_extracted.db')
    if (!fs.existsSync(dbPath)) extractMoriaDb(zm3, dbPath)
  }
  if (!fs.existsSync(dbPath)) return null
  return new Database(dbPath, { readonly: true })
}

/**
 * @returns {import('./parse').normalizeLink[]}
 */
function fetchLinksFromMoria(type, tmdbId, season, episode, userConfig = {}) {
  const db = openDb(userConfig)
  if (!db) return []

  let rows
  if (type === 'series' && season != null && episode != null) {
    rows = db
      .prepare(
        'SELECT link, calidad, audio, info FROM enlaces_series WHERE tmdb = ? AND temporada = ? AND episodio = ?'
      )
      .all(tmdbId, season, episode)
  } else {
    rows = db
      .prepare('SELECT link, calidad, audio, info FROM enlaces_pelis WHERE tmdb = ?')
      .all(tmdbId)
  }
  db.close()

  return rows.map((row, i) => {
    let asText = null
    try {
      asText = decryptPalantirLink(row.link)
    } catch {
      asText = null
    }
    const isUrl = asText && /^https?:\/\//i.test(asText)
    return {
      url: isUrl ? asText : null,
      name: `BD ${row.calidad || ''} ${row.audio || ''}`.trim(),
      quality: row.calidad || null,
      audio: row.audio || null,
      info: row.info || null,
      enc: row.link,
      index: i,
    }
  })
}

module.exports = { fetchLinksFromMoria, extractMoriaDb, openDb }
