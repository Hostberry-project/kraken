const config = require('../../config')
const { scoreLabel } = require('./sort')
const { isExcludedQuality, streamLabel } = require('./quality')

const INDEXER_NAME_RE = new RegExp(
  config.torrentSites.map((s) => s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
)

/** Orden en lista: indexadores → Peerflix → Torrentio → TorrentClaw */
const SOURCE_TIER = {
  INDEXER: 400000,
  PEERFLIX: 300000,
  TORRENTIO: 200000,
  TORRENTCLAW: 100000,
}

function isIndexerStream(stream) {
  const name = stream.name || ''
  if (/\[(Peerflix|Torrentio|TorrentClaw)\]/.test(name)) return false
  const label = name + (stream.title || '')
  return INDEXER_NAME_RE.test(label)
}

function sourceTier(stream) {
  if (isIndexerStream(stream)) return SOURCE_TIER.INDEXER
  const name = stream.name || ''
  if (/\[Peerflix\]/.test(name)) return SOURCE_TIER.PEERFLIX
  if (/\[Torrentio\]/.test(name)) return SOURCE_TIER.TORRENTIO
  if (/\[TorrentClaw\]/.test(name)) return SOURCE_TIER.TORRENTCLAW
  return 0
}

function streamScore(stream) {
  let score = sourceTier(stream) + scoreLabel(streamLabel(stream))
  if (stream.url) score += 150
  if (stream.title?.includes('Debrid') || stream.name?.includes('Debrid')) {
    score += 30
  }
  return score
}

function sortFinalStreams(streams) {
  const filtered = streams.filter((s) => !isExcludedQuality(s))
  return filtered.sort((a, b) => streamScore(b) - streamScore(a))
}

module.exports = { sortFinalStreams, streamScore, sourceTier, isIndexerStream }
