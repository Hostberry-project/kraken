const config = require('../config')

function getConfigureOptions() {
  return {
    addons: config.upstreamAddons.map((a) => ({
      id: a.id,
      key: addonConfigKey(a.id),
      name: a.name,
      defaultOn: a.enabled !== false,
    })),
    sites: config.torrentSites.map((s) => ({
      name: s.name,
      baseUrl: s.baseUrl,
      defaultOn: s.enabled !== false,
    })),
    defaultEnabledSites: config.torrentSites.map((s) => s.name).join(','),
  }
}

function addonConfigKey(id) {
  if (id === 'peerflix') return 'enablePeerflix'
  if (id === 'torrentio') return 'enableTorrentio'
  if (id === 'torrentclaw') return 'enableTorrentClaw'
  return `enable_${id}`
}

module.exports = { getConfigureOptions, addonConfigKey }
