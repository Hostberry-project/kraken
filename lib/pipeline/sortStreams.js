const config = require('../../config')
const { scoreLabel } = require('./sort')
const { isExcludedQuality, streamLabel } = require('./quality')

const INDEXER_NAME_RE = new RegExp(
  config.torrentSites.map((s) => s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
)

/** Peerflix primero, luego Torrentio, luego TorrentClaw (misma calidad). */
function upstreamTier(stream) {
  const name = stream.name || ''
  if (/\[Peerflix\]/.test(name)) return 10000
  if (/\[Torrentio\]/.test(name)) return 5000
  if (/\[TorrentClaw\]/.test(name)) return 2500
  return 0
}

function streamScore(stream) {
  let score = upstreamTier(stream) + scoreLabel(streamLabel(stream))
  if (stream.url) score += 200
  if (stream.name?.includes('Debrid') || stream.title?.includes('Debrid')) {
    score += 50
  }
  // Indexadores web (no llevan prefijo [Peerflix])
  if (
    stream.title?.includes(' · ') &&
    !/\[(Peerflix|Torrentio|TorrentClaw)\]/.test(stream.name || '')
  ) {
    const label = (stream.name || '') + (stream.title || '')
    if (INDEXER_NAME_RE.test(label)) score += 3000
  }
  return score
}

function sortFinalStreams(streams) {
  const filtered = streams.filter((s) => !isExcludedQuality(s))
  return filtered.sort((a, b) => streamScore(b) - streamScore(a))
}

module.exports = { sortFinalStreams, streamScore }
