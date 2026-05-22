#!/usr/bin/env node
/** Prueba búsqueda catálogo moria. Uso: node scripts/test-palantir-catalog.js luminosas */
const { searchMoriaCatalog } = require('../lib/palantir/moriaCatalog')

const q = process.argv[2] || 'luminosas'
const { metas } = searchMoriaCatalog('movie', { search: q }, {})
console.log(`Búsqueda "${q}": ${metas.length} películas\n`)
for (const m of metas.slice(0, 10)) {
  console.log(` ${m.id} | ${m.releaseInfo || '?'} | ${m.name}`)
}
