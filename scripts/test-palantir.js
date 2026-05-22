#!/usr/bin/env node
/**
 * Prueba base de datos moria (SQLite).
 * Uso:
 *   npm run test:moria
 *   npm run test:palantir -- 1330021
 *   ALLDEBRID_API_KEY=xxx npm run test:palantir -- 1330021
 */
const {
  isPalantirConfigured,
  isMoriaConfigured,
  getPalantirConfig,
} = require('../lib/palantir/config')
const { fetchLinksFromMoria } = require('../lib/palantir/moria')
const { fetchLinksByTmdb } = require('../lib/palantir/client')
const { normalizeLink } = require('../lib/palantir/parse')
const { getDebridServices } = require('../lib/debrid')
const allDebrid = require('../lib/debrid/alldebrid')

async function fetchLinks(type, tmdb, season, episode) {
  const cfg = getPalantirConfig({})
  if (cfg.apiBase && cfg.linksPath) {
    return fetchLinksByTmdb(type, tmdb, season, episode, { userConfig: {} })
  }
  const raw = fetchLinksFromMoria(type, tmdb, season, episode, cfg)
  return raw
    .filter((r) => r.url)
    .map((r) =>
      normalizeLink({
        url: r.url,
        name: r.name,
        quality: r.quality,
        audio: r.audio,
      })
    )
    .filter(Boolean)
}

async function main() {
  const tmdb = Number(process.argv[2]) || 1330021
  const cfg = getPalantirConfig({})

  if (!isPalantirConfigured({})) {
    console.error('Base de datos no configurada.')
    console.error('  moria:', isMoriaConfigured({}) ? 'ok' : 'falta PALANTIR_MORIA_DB o zm3')
    console.error('  api:', cfg.apiBase && cfg.linksPath ? 'ok' : 'falta API')
    console.error('Define PALANTIR_MORIA_DB o PALANTIR_API_BASE — ver README')
    process.exit(1)
  }

  console.log('Modo:', cfg.apiBase && cfg.linksPath ? 'HTTP API' : 'moria SQLite')
  if (cfg.moriaDb) console.log('DB:', cfg.moriaDb)
  if (cfg.moriaZm3) console.log('ZM3:', cfg.moriaZm3)

  const links = await fetchLinks('movie', tmdb, null, null)
  console.log(`\nEnlaces descifrados: ${links.length}`)
  for (const l of links.slice(0, 8)) {
    console.log(` - [${l.quality}] ${l.label}`)
    console.log(`   ${l.url || l.magnet || '?'}`)
  }
  if (!links.length) {
    console.error('Sin enlaces (TMDB sin filas en moria o DB desactualizada)')
    process.exit(2)
  }

  const services = getDebridServices({
    allDebridApiKey: process.env.ALLDEBRID_API_KEY || '',
  })
  if (!services.allDebrid) {
    console.log('\n(Opcional) Define ALLDEBRID_API_KEY para probar unlock del primer enlace')
    return
  }

  const first = links.find((l) => l.url)
  if (!first?.url) return

  console.log('\nProbando AllDebrid unlock...')
  try {
    const stream = await allDebrid.resolveHosterLink(first.url, services.allDebrid)
    console.log('OK stream:', stream.url?.slice(0, 100) + '...')
    console.log('   file:', stream.filename)
  } catch (e) {
    console.error('Unlock falló:', e.message)
    process.exit(3)
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
