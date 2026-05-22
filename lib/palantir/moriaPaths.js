/**
 * Rutas moria: variables de entorno o volumen Fly (/data).
 */
const fs = require('fs')
const path = require('path')

const FLY_DATA_DB = '/data/moria.db'
const FLY_DATA_ZM3 = '/data/moria.zm3'
const BUNDLED_ZM3 = path.join(__dirname, '../../moria_3_3_9.zm3')

function resolveMoriaDbPath() {
  if (process.env.PALANTIR_MORIA_DB) return process.env.PALANTIR_MORIA_DB
  if (process.env.FLY_APP_NAME) return FLY_DATA_DB
  return ''
}

function resolveMoriaZm3Path() {
  if (process.env.PALANTIR_MORIA_ZM3) return process.env.PALANTIR_MORIA_ZM3
  if (process.env.FLY_APP_NAME && fs.existsSync(FLY_DATA_ZM3)) return FLY_DATA_ZM3
  if (fs.existsSync(BUNDLED_ZM3)) return BUNDLED_ZM3
  return ''
}

function isFlyRuntime() {
  return Boolean(process.env.FLY_APP_NAME)
}

module.exports = {
  FLY_DATA_DB,
  FLY_DATA_ZM3,
  resolveMoriaDbPath,
  resolveMoriaZm3Path,
  isFlyRuntime,
}
