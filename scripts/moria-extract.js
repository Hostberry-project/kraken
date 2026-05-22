#!/usr/bin/env node
/**
 * Extrae moria.db desde moria.cm3 o .zm3 (mismo formato que Kodi).
 * Uso: node scripts/moria-extract.js entrada.zm3|cm3 salida.db
 */
const fs = require('fs')
const { extractMoriaDb } = require('../lib/palantir/moria')

const input = process.argv[2]
const output = process.argv[3]

if (!input || !output) {
  console.error('Uso: node scripts/moria-extract.js <entrada.zm3|cm3> <salida.db>')
  process.exit(1)
}

extractMoriaDb(input, output)
const mb = Math.round(fs.statSync(output).size / 1024 / 1024)
console.log('OK', output, `(${mb} MB)`)
