const config = require('../config')
const { getSearchQuery } = require('./cinemeta')
const { searchAllSites, flattenResults } = require('./scrapers')
const { processCandidates } = require('./pipeline')
const { formatStreamTitle, formatStreamName } = require('./pipeline/format')
const { sortFinalStreams } = require('./pipeline/sortStreams')
const { getDebridServices, hasAnyDebrid, resolveWithDebrid } = require('./debrid')
const {
  fetchAllUpstream,
  upstreamToCandidates,
  dedupeStreams,
} = require('./upstream')
const { parseUserConfig, getUpstreamAddons, hasEnabledUpstream } = require('./userConfig')
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

async function tryDebridList(candidates, services, limit) {
  const out = []
  let attempts = 0

  for (const candidate of candidates) {
    if (!candidate.magnet && !candidate.torrentUrl) continue
    if (attempts >= limit) break
    attempts++

    try {
      const resolved = await resolveWithDebrid(candidate, services)
      out.push({ candidate, resolved })
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

  const { query } = await getSearchQuery(type, stremioId)
  if (!query) {
    return buildFallbackSearchStreams(type, stremioId, null)
  }

  if (!hasAnyDebrid(services) && !hasEnabledUpstream(userOpts)) {
    const fallbacks = buildFallbackSearchStreams(type, stremioId, query)
    fallbacks.unshift({
      name: 'Kraken',
      title: 'Activa Peerflix/Torrentio/TorrentClaw o añade API debrid',
      externalUrl: 'https://real-debrid.com/apitoken',
    })
    return fallbacks
  }

  console.log(`[Kraken] "${query}"`)

  const proxyMeta = getProxyMeta(userConfig?.proxyUrl)

  const upstreamStreams = await fetchAllUpstream(type, stremioId, services, {
    strictSpanish: userOpts.strictSpanish,
    addons: upstreamAddons,
    proxyMeta,
  })

  const directCount = upstreamStreams.filter((s) => s.url).length
  console.log(
    `[Kraken] Upstream: ${upstreamStreams.length} (${directCount} directos)`
  )

  const streams = [...upstreamStreams]
  const useFastPath = directCount >= config.fastPathMinDirectStreams

  if (useFastPath) {
    console.log('[Kraken] Fast path: omitiendo indexadores locales')
  } else if (hasAnyDebrid(services)) {
    const scrapeMs = Math.max(3000, config.streamRequestTimeoutMs - 8000)
    const searchResults = await Promise.race([
      searchAllSites(query, proxyMeta),
      new Promise((resolve) => setTimeout(() => resolve([]), scrapeMs)),
    ])
    const raw = flattenResults(searchResults)
    const fromUpstream = upstreamToCandidates(
      upstreamStreams.filter((s) => !s.url)
    )
    const ranked = processCandidates([...raw, ...fromUpstream], {
      strictSpanish: userOpts.strictSpanish,
    })

    const debridResults = await tryDebridList(
      ranked,
      services,
      config.maxMagnetsToDebrid
    )

    for (const { candidate, resolved } of debridResults) {
      streams.push(toDebridStream(candidate, resolved, type, stremioId))
    }

    let p2pCount = 0
    for (const c of ranked) {
      if (p2pCount >= config.maxP2PStreams) break
      const already = streams.some(
        (s) => s.infoHash?.toLowerCase() === c.infoHash?.toLowerCase()
      )
      if (already) continue
      const p2p = toP2PStream(c, type, stremioId)
      if (p2p) {
        streams.push(p2p)
        p2pCount++
      }
    }
  }

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
