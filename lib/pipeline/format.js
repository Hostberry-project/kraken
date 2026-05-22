const { parseResolution } = require('./sort')

/**
 * Plantilla de nombre/título para streams:
 * [{source}] {res} · {lang}
 */
function formatStreamTitle(candidate, kind = 'debrid') {
  const res = parseResolution(candidate.label) || '—'
  const lang = /castellano|español|espanol|spanish/i.test(candidate.label)
    ? 'Castellano'
    : /latino/i.test(candidate.label)
      ? 'Latino'
      : 'ES'
  const prefix = kind === 'p2p' ? 'P2P' : 'Debrid'
  return `${prefix} · ${candidate.source} · ${res} · ${lang}`
}

function formatStreamName(candidate) {
  const res = parseResolution(candidate.label)
  return res ? `${candidate.source} ${res}` : candidate.source
}

module.exports = { formatStreamTitle, formatStreamName }
