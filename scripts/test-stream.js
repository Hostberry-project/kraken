#!/usr/bin/env node
/**
 * Kraken — prueba local sin Stremio:
 *   node scripts/test-stream.js
 *   node scripts/test-stream.js movie tt0111161
 *   REAL_DEBRID_API_KEY=xxx node scripts/test-stream.js
 */

const { buildStreamsInner } = require('../lib/streams')

const type = process.argv[2] || 'movie'
const id = process.argv[3] || 'tt0111161'

const userConfig = {
  soloEspanol: 'true',
  enableTorrentio: 'true',
  enablePeerflix: 'true',
  enableTorrentClaw: 'true',
  debridApiKey: process.env.REAL_DEBRID_API_KEY || '',
  alldebridApiKey: process.env.ALLDEBRID_API_KEY || '',
}

console.log(`\nPrueba: ${type} / ${id}\n`)

buildStreamsInner(type, id, userConfig)
  .then((streams) => {
    console.log(`\n--- ${streams.length} streams ---\n`)
    for (const s of streams.slice(0, 15)) {
      const extra = s.url
        ? `URL ${s.url.slice(0, 60)}...`
        : s.infoHash
          ? `P2P ${s.infoHash.slice(0, 12)}...`
          : s.externalUrl
            ? `WEB ${s.externalUrl}`
            : ''
      console.log(`• ${s.name}`)
      console.log(`  ${s.title || ''}`)
      console.log(`  ${extra}\n`)
    }
    if (streams.length > 15) {
      console.log(`… y ${streams.length - 15} más`)
    }
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
