const { filterSpanish } = require('./language')
const { dedupeCandidates } = require('./dedupe')
const { sortCandidates } = require('./sort')

function processCandidates(rawCandidates, options = {}) {
  const strict = options.strictSpanish !== false
  let list = dedupeCandidates(rawCandidates)
  list = filterSpanish(list, strict)
  list = sortCandidates(list)
  return list
}

module.exports = { processCandidates, filterSpanish, dedupeCandidates, sortCandidates }
