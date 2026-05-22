const config = require('../../config')

function streamLabel(stream) {
  return [
    stream.name,
    stream.title,
    stream.description,
    stream.behaviorHints?.filename,
  ]
    .filter(Boolean)
    .join(' ')
}

function isExcludedQuality(stream) {
  const text = streamLabel(stream)
  return (config.excludeQualities || []).some((re) => re.test(text))
}

module.exports = { isExcludedQuality, streamLabel }
