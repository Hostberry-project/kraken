#!/usr/bin/env node
const { fetchText } = require('../lib/http')
const {
  extractMagnetsWithLabels,
  extractDetailLinks,
  extractTorrentFileUrls,
  extractEncodedTorrentUrls,
} = require('../lib/scrapers/parse')
const { scrapeSite } = require('../lib/scrapers')
const config = require('../config')

const query = process.argv[2] || 'Avatar'

async function inspect(site) {
  const url = site.searchUrl.replace('{query}', encodeURIComponent(query))
  const html = await fetchText(url)
  console.log('\n===', site.name, '===')
  console.log('URL:', url)
  console.log('HTML:', html ? html.length : 'FAIL')

  if (!html) return

  const magnets = extractMagnetsWithLabels(html)
  const torrents = extractTorrentFileUrls(html, site.baseUrl)
  const encoded = extractEncodedTorrentUrls(html, site.baseUrl)
  const links = extractDetailLinks(html, site.baseUrl, 8, query)
  console.log(
    'Search magnets:',
    magnets.length,
    'torrents:',
    torrents.length,
    'encoded:',
    encoded.length,
    'detail:',
    links.length
  )
  if (links.length) console.log('  links:', links.slice(0, 4).join('\n    '))

  const result = await scrapeSite(site, query)
  console.log('scrapeSite items:', result.items.length)
}

async function main() {
  const names = process.argv.slice(3)
  const sites = names.length
    ? config.torrentSites.filter((s) => names.includes(s.name))
    : config.torrentSites.slice(0, 8)

  for (const site of sites) {
    await inspect(site)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
