const API = 'https://api.alldebrid.com/v4'
const { request } = require('../fetch')
const config = require('../../config')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiGet(path, apiKey) {
  const url = `${API}${path}${path.includes('?') ? '&' : '?'}apikey=${apiKey}`
  const res = await request(url, {}, { useProxy: config.proxy?.useForDebrid === true })
  const data = await res.json()
  if (data.status !== 'success') {
    throw new Error(data.error?.message || 'AllDebrid error')
  }
  return data.data
}

async function waitForFiles(magnetId, apiKey, maxWaitMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const data = await apiGet(`/magnet/status?id=${magnetId}`, apiKey)
    if (data.magnets?.ready) return data.magnets
    if (data.magnets?.error) throw new Error(data.magnets.error)
    await sleep(2500)
  }
  throw new Error('timeout AllDebrid')
}

async function resolveMagnet(magnet, apiKey) {
  const uploaded = await apiGet(
    `/magnet/upload?magnets[]=${encodeURIComponent(magnet)}`,
    apiKey
  )
  const magnetId = uploaded.magnets?.[0]?.id
  if (!magnetId) throw new Error('magnet no subido')

  await waitForFiles(magnetId, apiKey)
  const files = await apiGet(`/magnet/files?id=${magnetId}`, apiKey)
  const list = files.magnets?.files || files.files || []
  const video = list.find((f) => /\.(mkv|mp4|avi)$/i.test(f.n || f.filename || ''))
  const pick = video || list[0]
  if (!pick?.l || !pick?.e) throw new Error('sin archivo de vídeo')

  const unlocked = await apiGet(
    `/link/unlock?link=${encodeURIComponent(pick.l)}`,
    apiKey
  )
  return {
    url: unlocked.link,
    filename: pick.n || pick.filename || 'video.mkv',
  }
}

module.exports = { resolveMagnet }
