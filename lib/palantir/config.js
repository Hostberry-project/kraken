const config = require('../../config')

/** Configuración Palantir: variables de entorno del servidor. */
function getPalantirConfig(_userConfig = {}) {
  const base = process.env.PALANTIR_API_BASE || config.palantir?.apiBase || ''

  const linksPath = process.env.PALANTIR_LINKS_PATH || config.palantir?.linksPath || ''

  const apiKey = process.env.PALANTIR_API_KEY || ''

  const authHeader =
    process.env.PALANTIR_AUTH_HEADER ||
    config.palantir?.authHeader ||
    'Authorization'

  const authPrefix =
    process.env.PALANTIR_AUTH_PREFIX !== undefined
      ? process.env.PALANTIR_AUTH_PREFIX
      : config.palantir?.authPrefix ?? 'Bearer '

  const timeoutMs =
    Number(process.env.PALANTIR_TIMEOUT_MS) ||
    config.palantir?.timeoutMs ||
    12000

  const moriaDb = process.env.PALANTIR_MORIA_DB || config.palantir?.moriaDb || ''

  const moriaZm3 = process.env.PALANTIR_MORIA_ZM3 || config.palantir?.moriaZm3 || ''

  return {
    apiBase: base.replace(/\/$/, ''),
    linksPath,
    apiKey,
    authHeader,
    authPrefix,
    timeoutMs,
    moriaDb,
    moriaZm3,
    enabled: config.palantir?.enabled !== false,
  }
}

function isMoriaConfigured(userConfig = {}) {
  const c = getPalantirConfig(userConfig)
  return Boolean(c.moriaDb || c.moriaZm3)
}

function isPalantirConfigured(userConfig = {}) {
  const c = getPalantirConfig(userConfig)
  return Boolean(c.enabled && ((c.apiBase && c.linksPath) || isMoriaConfigured(userConfig)))
}

function fillPath(template, params) {
  let path = template
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    path = path.replace(new RegExp(`\\{${key}\\}`, 'gi'), encodeURIComponent(String(value)))
  }
  return path
}

module.exports = {
  getPalantirConfig,
  isPalantirConfigured,
  isMoriaConfigured,
  fillPath,
}
