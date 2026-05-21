const config = require('../../config')
const cache = require('../cache')
const { fetchJson } = require('../http')
const { matchesSpanish } = require('../pipeline/language')
const { isExcludedQuality } = require('../pipeline/quality')

function streamText(stream) {
  return [
    stream.name,
    stream.title,
    stream.description,
    stream.behaviorHints?.filename,
  ]
    .filter(Boolean)
    .join(' ')
}

function buildStreamUrl(addon, configPath, type, id) {
  const base = addon.baseUrl.replace(/\/$/, '')
  if (configPath != null && configPath !== '') {
    return `${base}/${configPath}/stream/${type}/${encodeURIComponent(id)}.json`
  }
  return `${base}/stream/${type}/${encodeURIComponent(id)}.json`
}

function tagStream(stream, addonName) {
  const prefix = `[${addonName}]`
  const name = stream.name?.includes(prefix)
    ? stream.name
    : `${prefix} ${stream.name || 'Stream'}`.trim()

  return {
    ...stream,
    name,
    behaviorHints: {
      ...stream.behaviorHints,
      bingeGroup: `kraken-${addonName}-${stream.behaviorHints?.bingeGroup || 'x'}`,
    },
  }
}

function filterUpstreamStreams(streams, strictSpanish, addon) {
  const filtered = streams.filter((s) => {
    if (isExcludedQuality(s)) return false
    if (!strictSpanish) return true
    if (addon.id === 'torrentio') {
      return matchesSpanish(streamText(s), false)
    }
    if (addon.id === 'peerflix') {
      return matchesSpanish(streamText(s), strictSpanish)
    }
    return matchesSpanish(streamText(s), strictSpanish)
  })
  return filtered.slice(0, config.maxStreamsPerUpstream)
}

async function fetchAddonStreams(addon, type, id, services, strictSpanish, options = {}) {
  if (!addon.enabled) return []

  const configPath = addon.buildConfig ? addon.buildConfig(services) : null
  const url = buildStreamUrl(addon, configPath, type, id)
  const cacheKey = `upstream:${url}`
  let data = cache.get(cacheKey)
  if (!data) {
    data = await fetchJson(url, {}, options.proxyMeta || {})
    if (data?.streams?.length) {
      cache.set(cacheKey, data, config.cacheTtlMs)
    }
  }

  if (!data?.streams?.length) {
    console.log(`[upstream] ${addon.name}: sin resultados`)
    return []
  }

  const tagged = data.streams.map((s) => tagStream(s, addon.name))
  const filtered = filterUpstreamStreams(tagged, strictSpanish, addon)
  console.log(`[upstream] ${addon.name}: ${filtered.length}/${data.streams.length} streams`)
  return filtered
}

function sortAddonsByPriority(addons) {
  const order = config.upstreamOrder || []
  return addons.slice().sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
}

async function fetchAllUpstream(type, id, services, options = {}) {
  const strictSpanish = options.strictSpanish !== false
  const addons = sortAddonsByPriority(
    options.addons || config.upstreamAddons.filter((a) => a.enabled)
  )

  const streams = []
  for (const addon of addons) {
    try {
      const list = await fetchAddonStreams(
        addon,
        type,
        id,
        services,
        strictSpanish,
        options
      )
      streams.push(...list)
    } catch (err) {
      console.warn('[upstream]', addon.name, err?.message)
    }
  }
  return streams
}

/** Convierte streams upstream con infoHash en candidatos para debrid local */
function upstreamToCandidates(upstreamStreams) {
  const candidates = []
  for (const s of upstreamStreams) {
    if (s.url) continue
    const hash = s.infoHash?.toLowerCase()
    if (!hash) continue
    candidates.push({
      magnet: `magnet:?xt=urn:btih:${hash}`,
      label: streamText(s),
      source: s.name?.replace(/^\[|\].*$/g, '').trim() || 'Upstream',
      torrentUrl: null,
      infoHash: hash,
      fileIdx: s.fileIdx,
    })
  }
  return candidates
}

function dedupeStreams(streams) {
  const seenUrl = new Set()
  const seenHash = new Set()
  const out = []

  for (const s of streams) {
    if (s.url) {
      if (seenUrl.has(s.url)) continue
      seenUrl.add(s.url)
      out.push(s)
      continue
    }
    const h = s.infoHash?.toLowerCase()
    if (h) {
      const key = `${h}:${s.fileIdx ?? ''}`
      if (seenHash.has(key)) continue
      seenHash.add(key)
    }
    out.push(s)
  }

  return out.slice(0, config.maxTotalStreams)
}

module.exports = {
  fetchAllUpstream,
  upstreamToCandidates,
  dedupeStreams,
  buildStreamUrl,
}
