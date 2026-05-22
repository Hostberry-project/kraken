/**
 * IDs de contenido Stremio: tt… (IMDb) o tmdb:… (catálogo Palantir/moria).
 */
function parseContentId(id) {
  const s = String(id)

  if (/^tmdb:\d+/i.test(s)) {
    const parts = s.split(':')
    return {
      imdbId: null,
      tmdbId: Number(parts[1]),
      season: parts[2] != null ? parseInt(parts[2], 10) : null,
      episode: parts[3] != null ? parseInt(parts[3], 10) : null,
    }
  }

  const parts = s.split(':')
  const head = parts[0]
  return {
    imdbId: /^tt\d+/i.test(head) ? head : null,
    tmdbId: null,
    season: parts[1] != null ? parseInt(parts[1], 10) : null,
    episode: parts[2] != null ? parseInt(parts[2], 10) : null,
  }
}

function isStreamId(id) {
  const s = String(id)
  return /^tt\d+/i.test(s) || /^tmdb:\d+/i.test(s)
}

function toStremioId(tmdb) {
  return `tmdb:${tmdb}`
}

module.exports = { parseContentId, isStreamId, toStremioId }
