/**
 * Lectura de enlaces desde moria (SQLite embebido en moria_*.zm3 de GitHub).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { decryptPalantirLink } = require('./decrypt')
const { resolveMoriaDbPath, resolveMoriaZm3Path } = require('./moriaPaths')

const ZIP_PREFIX_B64 =
  'UEsDBBQAAAAIAKJchVngR+RlsfTRAQBwSwUMAAAAc2V0dGluZ3MueG1s'

const EXTRACT_PY = `
import base64, sys, zipfile, os
PREFIX = base64.b64decode(${JSON.stringify(ZIP_PREFIX_B64)})
zm3, out = sys.argv[1], sys.argv[2]
with open(zm3, 'rb') as f:
    raw = f.read()
zip_path = zm3 + '.__kraken.zip'
with open(zip_path, 'wb') as z:
    z.write(PREFIX + raw)
with zipfile.ZipFile(zip_path, 'r') as zf:
    data = zf.read('settings.xml')
with open(out, 'wb') as o:
    o.write(data)
os.remove(zip_path)
`

function dbLooksValid(dbPath) {
  try {
    const st = fs.statSync(dbPath)
    return st.isFile() && st.size > 50 * 1024 * 1024
  } catch {
    return false
  }
}

function pythonBin() {
  for (const cmd of ['python3', 'python']) {
    const r = spawnSync(cmd, ['-c', 'import zipfile'], { encoding: 'utf8', timeout: 5000 })
    if (r.status === 0) return cmd
  }
  return null
}

function extractMoriaDbWithPython(zm3Path, outPath) {
  const py = pythonBin()
  if (!py) return false
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const r = spawnSync(py, ['-c', EXTRACT_PY, zm3Path, outPath], {
    encoding: 'utf8',
    timeout: 600000,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim()
    if (err) console.warn('[moria] python extract:', err.slice(0, 200))
    return false
  }
  return dbLooksValid(outPath)
}

function extractMoriaDbWithAdmZip(zm3Path, outPath) {
  let AdmZip
  try {
    AdmZip = require('adm-zip')
  } catch {
    return false
  }
  try {
    const raw = fs.readFileSync(zm3Path)
    const zip = new AdmZip(
      Buffer.concat([Buffer.from(ZIP_PREFIX_B64, 'base64'), raw])
    )
    const entry = zip.getEntry('settings.xml')
    if (!entry) return false
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, entry.getData())
    return dbLooksValid(outPath)
  } catch (e) {
    console.warn('[moria] adm-zip:', e.message)
    return false
  }
}

function extractMoriaDb(zm3Path, outPath) {
  if (extractMoriaDbWithPython(zm3Path, outPath)) return outPath
  if (extractMoriaDbWithAdmZip(zm3Path, outPath)) return outPath
  throw new Error(
    'No se pudo extraer moria (python3+zipfile o adm-zip). CRC/adm-zip incompatible con .zm3 Palantir.'
  )
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

module.exports = {
  fetchLinksFromMoria,
  extractMoriaDb,
  openDb,
  dbLooksValid,
}
