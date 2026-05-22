/**
 * Prepara moria.db al arrancar (Fly: volumen /data, .zm3 en imagen o GitHub).
 */
const fs = require('fs')
const path = require('path')
const { request } = require('../fetch')
const { extractMoriaDb, dbLooksValid } = require('./moria')
const { FLY_DATA_DB, FLY_DATA_ZM3, resolveMoriaDbPath } = require('./moriaPaths')

const DEFAULT_ZM3_URL =
  'https://raw.githubusercontent.com/Hostberry-project/kraken/main/moria_3_3_9.zm3'

const BUNDLED_ZM3_APP = '/app/moria_3_3_9.zm3'

let ensureInFlight = null

function dbLooksValid(dbPath) {
  try {
    const st = fs.statSync(dbPath)
    return st.isFile() && st.size > 50 * 1024 * 1024
  } catch {
    return false
  }
}

function zm3Candidates() {
  const list = [
    process.env.PALANTIR_MORIA_ZM3,
    BUNDLED_ZM3_APP,
    path.join(__dirname, '../../moria_3_3_9.zm3'),
  ].filter(Boolean)
  return [...new Set(list)]
}

async function downloadToFile(url, dest) {
  const res = await request(url, {}, { timeoutMs: 600000 })
  if (!res.ok) throw new Error(`descarga moria HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return dest
}

function tryExtractZm3(zm3Path, dbPath) {
  if (!zm3Path || !fs.existsSync(zm3Path)) {
    console.warn('[moria] .zm3 no encontrado:', zm3Path || '(vacío)')
    return false
  }
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    if (fs.existsSync(dbPath)) {
      const prev = fs.statSync(dbPath).size
      if (!dbLooksValid(dbPath)) {
        console.warn('[moria] Borrando moria.db inválida (%s bytes)', prev)
        fs.unlinkSync(dbPath)
      } else {
        return true
      }
    }
    const zm3Mb = Math.round(fs.statSync(zm3Path).size / 1024 / 1024)
    console.log(`[moria] Extrayendo ${zm3Mb} MB: ${zm3Path} -> ${dbPath}`)
    extractMoriaDb(zm3Path, dbPath)
    if (dbLooksValid(dbPath)) return true
    const size = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
    console.warn('[moria] Extracción inválida, tamaño:', size)
    return false
  } catch (e) {
    console.warn('[moria] Error extrayendo:', e.message)
    return false
  }
}

/**
 * @returns {Promise<{ ok: boolean, dbPath: string, source: string, message?: string }>}
 */
async function ensureMoriaDb() {
  const dbPath = resolveMoriaDbPath() || FLY_DATA_DB
  const onFly = Boolean(process.env.FLY_APP_NAME)

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  if (dbLooksValid(dbPath)) {
    return { ok: true, dbPath, source: 'existing' }
  }

  for (const zm3 of zm3Candidates()) {
    if (tryExtractZm3(zm3, dbPath)) {
      return { ok: true, dbPath, source: `zm3:${zm3}` }
    }
  }

  const zm3Dest = onFly ? FLY_DATA_ZM3 : dbPath.replace(/\.db$/, '.zm3')
  const url = process.env.PALANTIR_MORIA_ZM3_URL || DEFAULT_ZM3_URL

  try {
    console.log('[moria] Descargando base de datos desde', url)
    await downloadToFile(url, zm3Dest)
    if (tryExtractZm3(zm3Dest, dbPath)) {
      return { ok: true, dbPath, source: 'github-download' }
    }
  } catch (e) {
    console.warn('[moria] No se pudo preparar la base de datos:', e.message)
  }

  return {
    ok: false,
    dbPath,
    source: 'none',
    message: onFly
      ? 'Crea volumen: fly volume create moria_data -a kraken-stremio -r ams -n 1 --size 3'
      : 'Define PALANTIR_MORIA_DB o despliega en Fly.io',
  }
}

async function ensureMoriaDbOnce() {
  if (ensureInFlight) return ensureInFlight
  ensureInFlight = ensureMoriaDb()
    .then((r) => {
      if (r.ok && r.dbPath) {
        process.env.PALANTIR_MORIA_DB = r.dbPath
      }
      return r
    })
    .finally(() => {
      ensureInFlight = null
    })
  return ensureInFlight
}

function isMoriaPreparing() {
  return Boolean(ensureInFlight)
}

function getMoriaStatus() {
  const dbPath = resolveMoriaDbPath()
  const ready = dbPath ? dbLooksValid(dbPath) : false
  return {
    fly: Boolean(process.env.FLY_APP_NAME),
    dbPath: dbPath || null,
    ready,
    preparing: !ready && isMoriaPreparing(),
    sizeMb: dbPath && fs.existsSync(dbPath)
      ? Math.round(fs.statSync(dbPath).size / 1024 / 1024)
      : 0,
    moriaUrl: process.env.PALANTIR_MORIA_ZM3_URL || DEFAULT_ZM3_URL,
    zm3InImage: fs.existsSync(BUNDLED_ZM3_APP),
  }
}

/** Arranca preparación en segundo plano (no bloquea HTTP). */
function scheduleMoriaPrepare() {
  if (dbLooksValid(resolveMoriaDbPath() || FLY_DATA_DB)) return
  ensureMoriaDbOnce().catch((e) => console.warn('[moria] background:', e.message))
}

module.exports = {
  ensureMoriaDb,
  ensureMoriaDbOnce,
  scheduleMoriaPrepare,
  getMoriaStatus,
  isMoriaPreparing,
  dbLooksValid,
}
