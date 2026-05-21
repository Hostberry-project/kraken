const config = require('../../config')
const { fetchText } = require('../http')
const {
  extractMagnetsWithLabels,
  extractDetailLinks,
  extractTorrentFileUrls,
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

  for (const turl of extractTorrentFileUrls(searchHtml, site.baseUrl)) {
    items.push({
      magnet: null,
      label: turl.split('/').pop() || 'torrent',
      source: site.name,
      torrentUrl: turl,
    })
  }

  if (items.length >= 2) return { site: site.name, items }

  const detailLinks = extractDetailLinks(
    searchHtml,
    site.baseUrl,
    config.maxDetailPagesPerSite
  )

  for (const link of detailLinks) {
    const pageHtml = await fetchText(link, {}, proxyMeta)
    if (!pageHtml) continue
    pushItems(extractMagnetsWithLabels(pageHtml))
    for (const turl of extractTorrentFileUrls(pageHtml, site.baseUrl)) {
      items.push({
        magnet: null,
        label: turl.split('/').pop() || 'torrent',
        source: site.name,
        torrentUrl: turl,
      })
    }
    if (items.length >= 6) break
  }

  return { site: site.name, items }
}

async function searchAllSites(query, proxyMeta = {}) {
  const sites = config.torrentSites.filter((s) => s.enabled)
  const settled = await Promise.allSettled(
    sites.map((site) => scrapeSite(site, query, proxyMeta))
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
