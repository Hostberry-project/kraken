#!/usr/bin/env node
const { fetchTextWithMeta } = require('../lib/http')
const url = process.argv[2] || 'https://divxtotal.foo/?s=Lucky+Luke'

async function main() {
  const r = await fetchTextWithMeta(url, {}, { useProxy: false })
  console.log('URL:', url)
  console.log(
    'status:',
    r.status,
    'bytes:',
    r.text?.length || 0,
    'via:',
    r.via,
    r.error || ''
  )
  if (r.text?.includes('linktorrent')) console.log('OK: linktorrent')
  if (r.blocked) console.log('WARN: posible Cloudflare')
}

main().catch(console.error)
