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

function scrapeHeaders(site) {
  return { Referer: `${site.baseUrl}/` }
}

function alternateQueries(query) {
  const list = [query]
  if (/\bS\d{2}E\d{2}\b/i.test(query)) {
    const short = query
      .replace(/\s*S\d{2}E\d{2}\s*/gi, ' ')
      .replace(/\s*\d+x\d+\s*/gi, ' ')
      .trim()
    if (short && short !== query) list.push(short)
  }
  return list
}

async function scrapeSite(site, query, proxyMeta = {}) {
  const queries = alternateQueries(query)
  let lastHtmlLen = 0
  let fetchFailed = false

  for (const q of queries) {
    const searchUrl = applySearchUrl(site.searchUrl, q)
    const headers = scrapeHeaders(site)
    const searchHtml = await fetchText(searchUrl, { headers }, proxyMeta)
    if (!searchHtml) {
      fetchFailed = true
      continue
    }
    lastHtmlLen = searchHtml.length

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
      q
    )

    for (const link of detailLinks) {
      const pageHtml = await fetchText(link, { headers }, proxyMeta)
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

    if (items.length) return { site: site.name, items }
  }

  if (fetchFailed && !lastHtmlLen) {
    console.log(`[scraper] ${site.name}: sin HTML (bloqueo/red)`)
    return { site: site.name, items: [], fetchFailed: true }
  }

  if (lastHtmlLen) {
    console.log(
      `[scraper] ${site.name}: HTML ${lastHtmlLen} chars, 0 enlaces`
    )
  }

  return { site: site.name, items: [] }
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
  let fetchFailed = 0
  for (let i = 0; i < settled.length; i++) {
    const site = sites[i]?.name || '?'
    const r = settled[i]
    if (r.status === 'fulfilled') {
      if (r.value.fetchFailed) fetchFailed++
      if (r.value.items.length) results.push(r.value)
      else if (!r.value.fetchFailed) {
        console.log(`[scraper] ${site}: 0 resultados`)
      }
    } else {
      console.warn(`[scraper] ${site}:`, r.reason?.message)
    }
  }
  if (fetchFailed === sites.length && sites.length) {
    console.warn(
      `[scraper] ${fetchFailed}/${sites.length} webs sin HTML — IP del servidor bloqueada (usa PROXY_URL en Fly o fallback Torrentio)`
    )
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
