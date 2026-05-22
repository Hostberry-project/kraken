const config = require('../config')
const { getSearchQuery } = require('./cinemeta')
const { searchAllSites, flattenResults } = require('./scrapers')
const {
  extractTorrentioIndexerCandidates,
} = require('./scrapers/torrentioFallback')
const { processCandidates } = require('./pipeline')
const { formatStreamTitle, formatStreamName } = require('./pipeline/format')
const { sortFinalStreams } = require('./pipeline/sortStreams')
const { getDebridServices, hasAnyDebrid, resolveWithDebrid } = require('./debrid')
const {
  fetchAllUpstream,
  upstreamToCandidates,
  dedupeStreams,
} = require('./upstream')
const {
  parseUserConfig,
  getUpstreamAddons,
  hasEnabledUpstream,
  hasEnabledBaseDatos,
  getEnabledTorrentSites,
} = require('./userConfig')
const { fetchPalantirCandidates } = require('./palantir/streams')
const { isPalantirConfigured } = require('./palantir/config')
const { withTimeout } = require('./timeout')
const { getProxyMeta } = require('./http')

function parseStremioId(id) {
  const parts = String(id).split(':')
  return { id: parts[0], season: parts[1], episode: parts[2] }
}

function buildFallbackSearchStreams(type, stremioId, query) {
  const streams = []
  const q = query || parseStremioId(stremioId).id

  for (const site of config.torrentSites.filter((s) => s.enabled)) {
    const url = site.searchUrl.replace('{query}', encodeURIComponent(q))
    streams.push({
      name: site.name,
      title: `Buscar en ${site.name}`,
      externalUrl: url,
    })
  }
  return streams
}

function toP2PStream(candidate, type, stremioId) {
  if (!candidate.infoHash) return null
  const stream = {
    name: formatStreamName(candidate),
    title: formatStreamTitle(candidate, 'p2p'),
    infoHash: candidate.infoHash,
    behaviorHints: {
      bingeGroup: `kraken-p2p-${type}-${parseStremioId(stremioId).id}`,
    },
  }
  if (candidate.fileIdx != null) stream.fileIdx = candidate.fileIdx
  return stream
}

function toDebridStream(candidate, resolved, type, stremioId) {
  return {
    name: formatStreamName(candidate),
    title: formatStreamTitle(candidate, 'debrid') + ` · ${resolved.service}`,
    url: resolved.stream.url,
    behaviorHints: {
      notWebReady: true,
      bingeGroup: `kraken-debrid-${type}-${parseStremioId(stremioId).id}`,
      filename: resolved.stream.filename,
    },
  }
}

/** Prioriza candidatos de indexadores ES frente a magnets duplicados de upstream. */
function prioritizeIndexerSources(candidates, siteNames) {
  return [...candidates].sort((a, b) => {
    const aWeb = siteNames.has(a.source) ? 1 : 0
    const bWeb = siteNames.has(b.source) ? 1 : 0
    if (bWeb !== aWeb) return bWeb - aWeb
    return 0
  })
}

async function tryDebridList(candidates, services, limit, siteNames = null) {
  const out = []
  let attempts = 0

  let pool = candidates
  if (siteNames?.size) {
    const fromWeb = candidates.filter((c) => siteNames.has(c.source))
    const rest = candidates.filter((c) => !siteNames.has(c.source))
    pool = [...fromWeb, ...rest]
  }

  for (const candidate of pool) {
    const hasHoster =
      candidate.url && /^https?:\/\//i.test(candidate.url)
    if (!candidate.magnet && !candidate.torrentUrl && !hasHoster) continue
    if (attempts >= limit) break
    attempts++

    try {
      const resolved = await resolveWithDebrid(candidate, services)
      out.push({ candidate, resolved })
      if (siteNames?.has(candidate.source)) {
        console.log(`[debrid] OK ${candidate.source} (${resolved.service})`)
      }
    } catch (err) {
      console.warn(`[debrid] ${candidate.source}:`, err.message)
    }
  }

  return out
}

async function buildStreamsInner(type, stremioId, userConfig) {
  const userOpts = parseUserConfig(userConfig)
  const services = getDebridServices(userConfig)
  const upstreamAddons = getUpstreamAddons(userOpts)
  const started = Date.now()

  const { query } = await getSearchQuery(type, stremioId, userConfig)
  if (!query) {
    return buildFallbackSearchStreams(type, stremioId, null)
  }

  if (
    !hasAnyDebrid(services) &&
    !hasEnabledUpstream(userOpts) &&
    !hasEnabledBaseDatos(userOpts, userConfig)
  ) {
    const fallbacks = buildFallbackSearchStreams(type, stremioId, query)
    fallbacks.unshift({
      name: 'Kraken',
      title: 'Activa Peerflix/Torrentio/TorrentClaw, base de datos o API debrid',
      externalUrl: 'https://real-debrid.com/apitoken',
    })
    return fallbacks
  }

  if (
    userConfig.enableBaseDatos !== 'false' &&
    userConfig.enablePalantir !== 'false' &&
    !isPalantirConfigured(userConfig)
  ) {
    console.log('[moria] Base de datos activada pero moria no está lista en el servidor')
  }

  const debridLabel = [
    services.realDebrid ? 'Real-Debrid' : null,
    services.allDebrid ? 'AllDebrid' : null,
  ]
    .filter(Boolean)
    .join('+')
  console.log(`[Kraken] "${query}" | debrid: ${debridLabel || 'no'}`)

  const proxyMeta = getProxyMeta(userConfig?.proxyUrl)
  const enabledTorrentSites = getEnabledTorrentSites(userConfig)
  const siteNames = new Set(enabledTorrentSites.map((s) => s.name))

  console.log(
    `[Kraken] Indexadores activos: ${enabledTorrentSites.length}/${config.torrentSites.length}`
  )

  const scrapePromise = userOpts.enableIndexadores
    ? searchAllSites(query, proxyMeta, enabledTorrentSites)
    : Promise.resolve([])

  const upstreamPromise = fetchAllUpstream(type, stremioId, services, {
    strictSpanish: userOpts.strictSpanish,
    addons: upstreamAddons,
    proxyMeta,
  })

  const palantirPromise = userOpts.enableBaseDatos
    ? fetchPalantirCandidates(type, stremioId, { userConfig, proxyMeta })
    : Promise.resolve([])

  const phaseMs = Math.max(14000, config.streamRequestTimeoutMs - 12000)
  const [upstreamStreams, searchResults, palantirRaw] = await Promise.all([
    upstreamPromise,
    Promise.race([
      scrapePromise,
      new Promise((resolve) => setTimeout(() => resolve([]), phaseMs)),
    ]),
    palantirPromise,
  ])

  const directCount = upstreamStreams.filter((s) => s.url).length
  console.log(
    `[Kraken] Upstream: ${upstreamStreams.length} (${directCount} directos)`
  )

  const streams = []
  const useFastPath =
    config.fastPathMinDirectStreams > 0 &&
    directCount >= config.fastPathMinDirectStreams

  if (useFastPath) {
    console.log('[Kraken] Fast path: omitiendo indexadores web')
  } else if (userOpts.enableIndexadores) {
    let raw = flattenResults(searchResults)
    for (const r of searchResults) {
      console.log(`[Kraken] ${r.site}: ${r.items.length} enlaces`)
    }

    if (raw.length === 0) {
      const torrentioStreams = upstreamStreams.filter((s) =>
        (s.name || '').includes('[Torrentio]')
      )
      const fallback = extractTorrentioIndexerCandidates(
        torrentioStreams,
        siteNames
      )
      if (fallback.length) {
        console.log(
          `[Kraken] Indexadores vía Torrentio: ${fallback.length} (webs bloquean IP del servidor)`
        )
        raw = fallback
      }
    }

    console.log(`[Kraken] Indexadores: ${raw.length} candidatos`)
    if (palantirRaw.length) {
      console.log(`[Kraken] Base de datos: ${palantirRaw.length} candidatos`)
    }

    const fromUpstream = upstreamToCandidates(
      upstreamStreams.filter((s) => !s.url)
    )
    const moriaRanked = processCandidates(palantirRaw, { strictSpanish: false })
    const otherRanked = processCandidates([...raw, ...fromUpstream], {
      strictSpanish: userOpts.strictSpanish,
    })
    let ranked = [...otherRanked, ...moriaRanked]

    ranked = prioritizeIndexerSources(ranked, siteNames)

    const indexerOnly = ranked.filter((c) => siteNames.has(c.source))
    const palantirOnly = ranked.filter((c) => c.source === 'Base de datos')
    const debridPool =
      indexerOnly.length > 0
        ? [...indexerOnly, ...palantirOnly]
        : ranked

    if (hasAnyDebrid(services)) {
      const debridLimit = Math.min(
        config.maxMagnetsToDebrid,
        config.maxIndexerDebridAttempts || config.maxMagnetsToDebrid
      )
      const debridResults = await tryDebridList(
        debridPool,
        services,
        debridLimit,
        new Set([...siteNames, 'Base de datos'])
      )

      for (const { candidate, resolved } of debridResults) {
        streams.push(toDebridStream(candidate, resolved, type, stremioId))
      }
      if (!debridResults.length && raw.length) {
        console.log(
          '[Kraken] Hay enlaces web pero debrid falló (revisa API o prueba sin filtro solo español)'
        )
      }
    } else if (raw.length === 0) {
      console.log(
        '[Kraken] Sin resultados web; en Fly.io las webs suelen bloquear el servidor'
      )
    }

    let p2pCount = 0
    const p2pPool = indexerOnly.length ? indexerOnly : ranked
    for (const c of p2pPool) {
      if (p2pCount >= config.maxP2PStreams) break
      if (!c.magnet && !c.infoHash) continue
      const hash = c.infoHash || c.magnet?.match(/btih:([a-f0-9]{40})/i)?.[1]
      if (!hash) continue
      const already = streams.some(
        (s) => s.infoHash?.toLowerCase() === hash.toLowerCase()
      )
      if (already) continue
      const p2p = toP2PStream({ ...c, infoHash: hash }, type, stremioId)
      if (p2p) {
        streams.push(p2p)
        p2pCount++
      }
    }
    if (p2pCount) console.log(`[Kraken] P2P indexadores: ${p2pCount}`)
  } else if (palantirRaw.length && userOpts.enableBaseDatos) {
    console.log(`[Kraken] Solo base de datos: ${palantirRaw.length} candidatos`)
    let ranked = processCandidates(palantirRaw, { strictSpanish: false })
    if (hasAnyDebrid(services)) {
      const debridResults = await tryDebridList(
        ranked,
        services,
        config.maxMagnetsToDebrid,
        new Set(['Base de datos'])
      )
      for (const { candidate, resolved } of debridResults) {
        streams.push(toDebridStream(candidate, resolved, type, stremioId))
      }
    }
    let p2pCount = 0
    for (const c of ranked) {
      if (p2pCount >= config.maxP2PStreams) break
      const hash = c.infoHash || c.magnet?.match(/btih:([a-fA-F0-9]{40})/i)?.[1]
      if (!hash) continue
      const p2p = toP2PStream({ ...c, infoHash: hash }, type, stremioId)
      if (p2p) {
        streams.push(p2p)
        p2pCount++
      }
    }
  } else if (!enabledTorrentSites.length) {
    console.log(
      '[Kraken] Ningún indexador activo — abre /configure y activa webs'
    )
  }

  const upstreamOrdered = [
    ...upstreamStreams.filter((s) => (s.name || '').includes('[Peerflix]')),
    ...upstreamStreams.filter((s) => (s.name || '').includes('[Torrentio]')),
    ...upstreamStreams.filter((s) => (s.name || '').includes('[TorrentClaw]')),
    ...upstreamStreams.filter(
      (s) =>
        !/\[(Peerflix|Torrentio|TorrentClaw)\]/.test(s.name || '')
    ),
  ]
  streams.push(...upstreamOrdered)

  const final = sortFinalStreams(dedupeStreams(streams))
  console.log(`[Kraken] ${final.length} streams en ${Date.now() - started}ms`)

  if (final.length) return final
  return buildFallbackSearchStreams(type, stremioId, query)
}

async function buildStreams(type, stremioId, userConfig) {
  return withTimeout(
    buildStreamsInner(type, stremioId, userConfig),
    config.streamRequestTimeoutMs,
    `stream ${type}/${stremioId}`
  )
}

module.exports = { buildStreams, buildStreamsInner, buildFallbackSearchStreams }
