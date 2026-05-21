const config = require('../config')

function parseEnabledSiteNames(userConfig = {}) {
  if (userConfig.enableIndexadores === 'false') return []

  const allNames = config.torrentSites.map((s) => s.name)
  const raw = userConfig.enabledSites

  // Sin campo (instalación antigua) → todos activos
  if (raw === undefined || raw === null || raw === 'all') return allNames
  if (String(raw).trim() === '') return []

  const selected = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return selected.filter((n) => allNames.includes(n))
}

function getEnabledTorrentSites(userConfig = {}) {
  const names = new Set(parseEnabledSiteNames(userConfig))
  return config.torrentSites.filter((s) => s.enabled && names.has(s.name))
}

function parseUserConfig(userConfig = {}) {
  const enabledSites = parseEnabledSiteNames(userConfig)
  return {
    strictSpanish: userConfig.soloEspanol !== 'false',
    enableTorrentio: userConfig.enableTorrentio !== 'false',
    enablePeerflix: userConfig.enablePeerflix !== 'false',
    enableTorrentClaw: userConfig.enableTorrentClaw !== 'false',
    enableIndexadores:
      userConfig.enableIndexadores !== 'false' && enabledSites.length > 0,
    enabledSiteNames: enabledSites,
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

module.exports = {
  parseUserConfig,
  getUpstreamAddons,
  hasEnabledUpstream,
  getEnabledTorrentSites,
  parseEnabledSiteNames,
}
