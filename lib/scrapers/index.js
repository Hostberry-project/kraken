const config = require('../../config')
const { fetchText } = require('../http')
const {
  extractMagnetsWithLabels,
  extractDetailLinks,
  extractTorrentFileUrls,
  extractEncodedTorrentUrls,
  pushTorrentItems,
} = require('./parse')

function applySearchUrl(template, query) {
  return template.replace('{query}', encodeURIComponent(query))
}

async function scrapeSite(site, query, proxyMeta = {}) {
  const searchUrl = applySearchUrl(site.searchUrl, query)
  const searchHtml = await fetchText(searchUrl, {}, proxyMeta)
  if (!searchHtml) return { site: site.name, items: [] }

  const items = []
  const pushItems = (list) => {
    for (const { magnet, label } of list) {
      items.push({ magnet, label, source: site.name, torrentUrl: null })
    }
  }

  pushItems(extractMagnetsWithLabels(searchHtml))
  pushTorrentItems(
    items,
    [
      ...extractTorrentFileUrls(searchHtml, site.baseUrl),
      ...extractEncodedTorrentUrls(searchHtml, site.baseUrl),
    ],
    site.name
  )

  if (items.length >= 2) return { site: site.name, items }

  const detailLinks = extractDetailLinks(
    searchHtml,
    site.baseUrl,
    config.maxDetailPagesPerSite,
    query
  )

  for (const link of detailLinks) {
    const pageHtml = await fetchText(link, {}, proxyMeta)
    if (!pageHtml) continue
    pushItems(extractMagnetsWithLabels(pageHtml))
    pushTorrentItems(
      items,
      [
        ...extractTorrentFileUrls(pageHtml, site.baseUrl),
        ...extractEncodedTorrentUrls(pageHtml, site.baseUrl),
      ],
      site.name
    )
    if (items.length >= 6) break
  }

  return { site: site.name, items }
}

async function runInBatches(items, batchSize, fn) {
  const out = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const settled = await Promise.allSettled(chunk.map(fn))
    out.push(...settled)
  }
  return out
}

async function searchAllSites(query, proxyMeta = {}, sitesFilter = null) {
  const sites = (sitesFilter || config.torrentSites).filter((s) => s.enabled)
  const batchSize = config.scrapeConcurrency || 8
  const settled = await runInBatches(sites, batchSize, (site) =>
    scrapeSite(site, query, proxyMeta)
  )

  const results = []
  for (let i = 0; i < settled.length; i++) {
    const site = sites[i]?.name || '?'
    const r = settled[i]
    if (r.status === 'fulfilled') {
      if (r.value.items.length) results.push(r.value)
      else console.log(`[scraper] ${site}: 0 resultados`)
    } else {
      console.warn(`[scraper] ${site}:`, r.reason?.message)
    }
  }
  return results
}

function flattenResults(searchResults) {
  const candidates = []
  for (const r of searchResults) {
    for (const item of r.items) {
      if (item.magnet || item.torrentUrl) candidates.push(item)
    }
  }
  return candidates
}

module.exports = { searchAllSites, flattenResults, scrapeSite }
