const config = require('../config')

function parseUserConfig(userConfig = {}) {
  return {
    strictSpanish: userConfig.soloEspanol !== 'false',
    enableTorrentio: userConfig.enableTorrentio !== 'false',
    enablePeerflix: userConfig.enablePeerflix !== 'false',
    enableTorrentClaw: userConfig.enableTorrentClaw !== 'false',
  }
}

function getUpstreamAddons(userOpts) {
  return config.upstreamAddons
    .map((addon) => {
      let enabled = addon.enabled
      if (addon.id === 'torrentio') enabled = userOpts.enableTorrentio
      if (addon.id === 'peerflix') enabled = userOpts.enablePeerflix
      if (addon.id === 'torrentclaw') enabled = userOpts.enableTorrentClaw
      return { ...addon, enabled }
    })
    .filter((a) => a.enabled)
}

function hasEnabledUpstream(userOpts) {
  return getUpstreamAddons(userOpts).length > 0
}

module.exports = { parseUserConfig, getUpstreamAddons, hasEnabledUpstream }
