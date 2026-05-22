const API = 'https://api.real-debrid.com/rest/1.0'
const { request } = require('../fetch')
const config = require('../../config')

function useProxyForDebrid() {
  return config.proxy?.useForDebrid === true
}

async function rdFetch(url, options = {}) {
  const res = await request(url, options, { useProxy: useProxyForDebrid() })
  return res
}

function headers(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiPost(path, apiKey, body) {
  const res = await rdFetch(`${API}${path}`, {
    method: 'POST',
    headers: headers(apiKey),
    body: new URLSearchParams(body).toString(),
  })
  if (res.status === 204) return {}
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`RD ${path}: ${res.status} ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function apiGet(path, apiKey) {
  const res = await rdFetch(`${API}${path}`, { headers: headers(apiKey) })
  const text = await res.text()
  if (!res.ok) throw new Error(`RD ${path}: ${res.status} ${text}`)
  return JSON.parse(text)
}

async function waitForLinks(torrentId, apiKey, maxWaitMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const info = await apiGet(`/torrents/info/${torrentId}`, apiKey)

    if (info.status === 'error') {
      throw new Error(info.error || 'torrent error')
    }

    if (info.status === 'waiting_files_selection') {
      await apiPost(`/torrents/selectFiles/${torrentId}`, apiKey, {
        files: 'all',
      })
    }

    if (info.links && info.links.length > 0) {
      return info
    }

    if (info.status === 'downloaded' && info.links?.length) {
      return info
    }

    await sleep(2000)
  }
  throw new Error('timeout esperando enlaces de Real-Debrid')
}

async function unrestrictFirstVideoLink(links, apiKey) {
  const videoExt = /\.(mp4|mkv|avi|mov|m4v|webm)(\?|$)/i

  for (const link of links) {
    const data = await apiGet(
      `/unrestrict/link?link=${encodeURIComponent(link)}`,
      apiKey
    )
    const url = data.download || data.link
    if (url && (videoExt.test(url) || !url.includes('.rar'))) {
      return {
        url,
        filename: data.filename || 'video.mkv',
      }
    }
  }

  if (links[0]) {
    const data = await apiGet(
      `/unrestrict/link?link=${encodeURIComponent(links[0])}`,
      apiKey
    )
    return {
      url: data.download || data.link,
      filename: data.filename || 'video.mkv',
    }
  }

  return null
}

async function resolveMagnet(magnet, apiKey) {
  const added = await apiPost('/torrents/addMagnet', apiKey, { magnet })
  const torrentId = added.id
  const info = await waitForLinks(torrentId, apiKey)
  const stream = await unrestrictFirstVideoLink(info.links, apiKey)
  if (!stream?.url) throw new Error('sin enlace directo')
  return stream
}

async function resolveTorrentUrl(torrentUrl, apiKey) {
  const added = await apiPost('/torrents/addTorrent', apiKey, {
    link: torrentUrl,
  })
  const torrentId = added.id
  const info = await waitForLinks(torrentId, apiKey)
  const stream = await unrestrictFirstVideoLink(info.links, apiKey)
  if (!stream?.url) throw new Error('sin enlace directo')
  return stream
}

module.exports = { resolveMagnet, resolveTorrentUrl }
