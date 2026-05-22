const config = require('../../config')

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function matchesSpanish(label, strict) {
  const text = normalize(label)
  const { include, exclude, allowUnknown } = config.language

  const hasInclude = include.some((kw) => text.includes(normalize(kw)))
  const hasExclude = exclude.some((kw) => text.includes(normalize(kw)))

  if (strict && hasExclude) return false
  if (hasInclude) return true
  if (hasExclude && strict) return false
  if (allowUnknown && !hasExclude) return true
  return !strict
}

function filterSpanish(candidates, strict = true) {
  return candidates.filter((c) => matchesSpanish(c.label || c.magnet, strict))
}

module.exports = { matchesSpanish, filterSpanish, normalize }
