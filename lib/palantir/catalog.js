const { isPalantirConfigured, isMoriaConfigured, getPalantirConfig } = require('./config')
const { searchMoriaCatalog, getMoriaMeta } = require('./moriaCatalog')

const CATALOG_IDS = {
  movie: 'bd-pelis',
  series: 'bd-series',
}

const LEGACY_CATALOG_IDS = { movie: 'palantir-pelis', series: 'palantir-series' }

function isPalantirCatalog(type, id) {
  return id === CATALOG_IDS[type] || id === LEGACY_CATALOG_IDS[type]
}

async function handlePalantirCatalog(args) {
  const { type, id, extra = {} } = args
  const { normalizeUserConfig } = require('../userConfigNormalize')
  const userConfig = normalizeUserConfig(args.config)

  if (
    userConfig.enableBaseDatos === 'false' ||
    userConfig.enablePalantir === 'false'
  ) {
    console.log('[moria] catálogo desactivado en config Stremio')
    return { metas: [] }
  }
  if (!isPalantirCatalog(type, id)) {
    return { metas: [] }
  }
  if (!isPalantirConfigured(userConfig) || !isMoriaConfigured(userConfig)) {
    console.warn('[moria] catálogo: moria no configurada en servidor')
    return { metas: [] }
  }

  return searchMoriaCatalog(type, extra, userConfig)
}

module.exports = { handlePalantirCatalog, getMoriaMeta }
