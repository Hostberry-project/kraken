/**
 * Prepara moria.db al arrancar (Fly: volumen /data, .zm3 en imagen o GitHub).
 */
const fs = require('fs')
const path = require('path')
const { request } = require('../fetch')
const { extractMoriaDb } = require('./moria')
const { FLY_DATA_DB, FLY_DATA_ZM3, resolveMoriaDbPath } = require('./moriaPaths')

const DEFAULT_ZM3_URL =
  'https://github.com/Hostberry-project/kraken/raw/refs/heads/main/moria_3_3_9.zm3'

function dbLooksValid(dbPath) {
  try {
    const st = fs.statSync(dbPath)
    return st.isFile() && st.size > 50 * 1024 * 1024
  } catch {
    return false
  }
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
  if (!zm3Path || !fs.existsSync(zm3Path)) return false
  extractMoriaDb(zm3Path, dbPath)
  return dbLooksValid(dbPath)
}

/**
 * @returns {{ ok: boolean, dbPath: string, source: string, message?: string }}
 */
async function ensureMoriaDb() {
  const dbPath = resolveMoriaDbPath() || FLY_DATA_DB
  const onFly = Boolean(process.env.FLY_APP_NAME)

  if (dbLooksValid(dbPath)) {
    return { ok: true, dbPath, source: 'existing' }
  }

  const bundledZm3 = process.env.PALANTIR_MORIA_ZM3 || ''
  if (tryExtractZm3(bundledZm3, dbPath)) {
    return { ok: true, dbPath, source: onFly ? 'fly-image-zm3' : 'bundled-zm3' }
  }

  const zm3Dest = onFly ? FLY_DATA_ZM3 : dbPath.replace(/\.db$/, '.zm3')
  const url = process.env.PALANTIR_MORIA_ZM3_URL || DEFAULT_ZM3_URL

  try {
    console.log('[palantir] Descargando moria desde', url)
    await downloadToFile(url, zm3Dest)
    if (tryExtractZm3(zm3Dest, dbPath)) {
      return { ok: true, dbPath, source: 'github-download' }
    }
  } catch (e) {
    console.warn('[palantir] No se pudo preparar moria:', e.message)
  }

  return {
    ok: false,
    dbPath,
    source: 'none',
    message: onFly
      ? 'Moria no lista en /data; revisa volumen moria_data o PALANTIR_MORIA_ZM3_URL'
      : 'Define PALANTIR_MORIA_DB o despliega en Fly.io',
  }
}

function getMoriaStatus() {
  const dbPath = resolveMoriaDbPath()
  return {
    fly: Boolean(process.env.FLY_APP_NAME),
    dbPath: dbPath || null,
    ready: dbPath ? dbLooksValid(dbPath) : false,
    sizeMb: dbPath && fs.existsSync(dbPath)
      ? Math.round(fs.statSync(dbPath).size / 1024 / 1024)
      : 0,
    moriaUrl: process.env.PALANTIR_MORIA_ZM3_URL || DEFAULT_ZM3_URL,
  }
}

module.exports = { ensureMoriaDb, getMoriaStatus, dbLooksValid }
