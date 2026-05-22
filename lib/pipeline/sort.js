const config = require('../../config')
const { normalize } = require('./language')

function scoreLabel(label) {
  const text = normalize(label)
  let score = 0

  for (const { re, score: s } of config.sort.resolutions) {
    if (re.test(text)) score += s
  }
  for (const { re, score: s } of config.sort.qualities) {
    if (re.test(text)) score += s
  }

  if (/castellano|español|espanol|spanish|latino/i.test(label)) score += 15
  if (/hdr|dv|atmos/i.test(text)) score += 5

  return score
}

function sortCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    const diff = scoreLabel(b.label) - scoreLabel(a.label)
    if (diff !== 0) return diff
    return a.source.localeCompare(b.source)
  })
}

function parseResolution(label) {
  const text = normalize(label)
  if (/2160p|4k/i.test(text)) return '4K'
  if (/1080p/i.test(text)) return '1080p'
  if (/720p/i.test(text)) return '720p'
  if (/480p/i.test(text)) return '480p'
  return ''
}

module.exports = { sortCandidates, scoreLabel, parseResolution }
