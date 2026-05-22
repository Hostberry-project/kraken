const realDebrid = require('./real-debrid')
const allDebrid = require('./alldebrid')

async function resolveWithDebrid(candidate, services) {
  const errors = []

  const hosterUrl =
    candidate.url && /^https?:\/\//i.test(candidate.url) ? candidate.url : null

  if (hosterUrl && services.allDebrid) {
    try {
      const stream = await allDebrid.resolveHosterLink(hosterUrl, services.allDebrid)
      return { stream, service: 'AllDebrid' }
    } catch (e) {
      errors.push(`AD hoster: ${e.message}`)
    }
  }

  if (services.realDebrid) {
    try {
      const stream = await realDebrid.resolveMagnet(
        candidate.magnet,
        services.realDebrid
      )
      return { stream, service: 'Real-Debrid' }
    } catch (e) {
      errors.push(`RD: ${e.message}`)
    }
  }

  if (services.allDebrid) {
    try {
      const stream = await allDebrid.resolveMagnet(
        candidate.magnet,
        services.allDebrid
      )
      return { stream, service: 'AllDebrid' }
    } catch (e) {
      errors.push(`AD: ${e.message}`)
    }
  }

  if (candidate.torrentUrl && services.allDebrid) {
    try {
      const stream = await allDebrid.resolveTorrentUrl(
        candidate.torrentUrl,
        services.allDebrid
      )
      return { stream, service: 'AllDebrid' }
    } catch (e) {
      errors.push(`AD file: ${e.message}`)
    }
  }

  if (candidate.torrentUrl && services.realDebrid) {
    try {
      const stream = await realDebrid.resolveTorrentUrl(
        candidate.torrentUrl,
        services.realDebrid
      )
      return { stream, service: 'Real-Debrid' }
    } catch (e) {
      errors.push(`RD file: ${e.message}`)
    }
  }

  throw new Error(errors.join(' | ') || 'sin debrid configurado')
}

function getDebridServices(userConfig) {
  const cfg = userConfig || {}
  const allDebrid =
    (cfg.alldebridApiKey || cfg.allDebridApiKey || process.env.ALLDEBRID_API_KEY || '')
      .trim() || null
  const realDebrid =
    (cfg.debridApiKey || process.env.REAL_DEBRID_API_KEY || '').trim() || null
  return { realDebrid, allDebrid }
}

function hasAnyDebrid(services) {
  return !!(services.realDebrid || services.allDebrid)
}

module.exports = { resolveWithDebrid, getDebridServices, hasAnyDebrid }
