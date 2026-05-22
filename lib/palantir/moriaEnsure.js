/**
 * Prepara moria.db al arrancar (Fly: volumen /data o descarga URL).
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

/**
 * @returns {{ ok: boolean, dbPath: string, source: string, message?: string }}
 */
async function ensureMoriaDb() {
  const dbPath = resolveMoriaDbPath() || FLY_DATA_DB

  if (dbLooksValid(dbPath)) {
    return { ok: true, dbPath, source: 'existing' }
  }

  const zm3Dest = process.env.FLY_APP_NAME ? FLY_DATA_ZM3 : dbPath.replace(/\.db$/, '.zm3')
  let zm3Path = process.env.PALANTIR_MORIA_ZM3 || ''

  if (zm3Path && fs.existsSync(zm3Path)) {
    extractMoriaDb(zm3Path, dbPath)
    if (dbLooksValid(dbPath)) return { ok: true, dbPath, source: 'local-zm3' }
  }

  const url = process.env.PALANTIR_MORIA_ZM3_URL || DEFAULT_ZM3_URL
  try {
    console.log('[palantir] Descargando moria desde', url)
    await downloadToFile(url, zm3Dest)
    extractMoriaDb(zm3Dest, dbPath)
    if (dbLooksValid(dbPath)) {
      return { ok: true, dbPath, source: 'download' }
    }
  } catch (e) {
    console.warn('[palantir] No se pudo preparar moria:', e.message)
  }

  return {
    ok: false,
    dbPath,
    source: 'none',
    message:
      'Sube moria.db a /data (scripts/upload-moria-fly.ps1) o define PALANTIR_MORIA_ZM3_URL',
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
  }
}

module.exports = { ensureMoriaDb, getMoriaStatus, dbLooksValid }
