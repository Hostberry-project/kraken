const { isPalantirConfigured, isMoriaConfigured, getPalantirConfig } = require('./config')
const { searchMoriaCatalog, getMoriaMeta } = require('./moriaCatalog')

const CATALOG_IDS = {
  movie: 'palantir-pelis',
  series: 'palantir-series',
}

function isPalantirCatalog(type, id) {
  return id === CATALOG_IDS[type]
}

async function handlePalantirCatalog(args) {
  const { type, id, extra = {}, config: userConfig = {} } = args

  if (userConfig.enablePalantir === 'false') {
    return { metas: [] }
  }
  if (!isPalantirConfigured(userConfig) || !isMoriaConfigured(userConfig)) {
    return { metas: [] }
  }
  if (!isPalantirCatalog(type, id)) {
    return { metas: [] }
  }

  return searchMoriaCatalog(type, extra, userConfig)
}

module.exports = { handlePalantirCatalog, getMoriaMeta }
