#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { extractMoriaDb } = require('../lib/palantir/moria')
const { openDb } = require('../lib/palantir/moria')
const { searchMoriaCatalog } = require('../lib/palantir/moriaCatalog')

const dbPath = path.join(__dirname, '../moria_test_quick.db')
const zm3 = path.join(__dirname, '../moria_3_3_9.zm3')

if (!fs.existsSync(dbPath)) extractMoriaDb(zm3, dbPath)

process.env.PALANTIR_MORIA_DB = dbPath

const db = openDb({})
console.log('count pelis', db.prepare('SELECT COUNT(*) as n FROM pelis').get().n)

const q = process.argv[2] || 'luminosas'
const feed = searchMoriaCatalog('movie', {}, {})
console.log('feed (sin busqueda):', feed.metas.length, feed.metas[0]?.name)

const r = searchMoriaCatalog('movie', { search: q }, {})
console.log(`search "${q}":`, r.metas.length, r.metas.slice(0, 5).map((m) => m.name))

db.close()
