const config = require('../config')
const { request } = require('./fetch')

function getProxyMeta(userProxyUrl) {
  const url =
    userProxyUrl ||
    config.proxy?.url ||
    undefined
  return {
    useProxy: config.proxy?.enabled !== false,
    proxyUrl: url,
  }
}

async function fetchText(url, options = {}, meta = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    config.scrapeTimeoutMs || config.requestTimeoutMs
  )

  try {
    const res = await request(
      url,
      {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-ES,es;q=0.9',
          ...(options.headers || {}),
        },
        redirect: 'follow',
      },
      meta
    )
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(url, options = {}, meta = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    const res = await request(
      url,
      {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent,
          Accept: 'application/json',
          ...(options.headers || {}),
        },
        redirect: 'follow',
      },
      meta
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { fetchText, fetchJson, getProxyMeta }
