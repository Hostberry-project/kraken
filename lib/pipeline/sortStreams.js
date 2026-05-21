const { scoreLabel } = require('./sort')
const { isExcludedQuality, streamLabel } = require('./quality')

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
    const fromWeb =
      /DivxTotal|GranTorrent|MejorTorrent|DonTorrent|EliteTorrent|NewPCT|ZonaTorrent|TorrentLocura|PedroTorrent/.test(
        stream.name || ''
      ) ||
      /DivxTotal|GranTorrent|MejorTorrent|DonTorrent|EliteTorrent|NewPCT|ZonaTorrent|TorrentLocura|PedroTorrent/.test(
        stream.title || ''
      )
    if (fromWeb) score += 3000
  }
  return score
}

function sortFinalStreams(streams) {
  const filtered = streams.filter((s) => !isExcludedQuality(s))
  return filtered.sort((a, b) => streamScore(b) - streamScore(a))
}

module.exports = { sortFinalStreams, streamScore }
