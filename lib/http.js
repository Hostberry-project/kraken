const config = require('../config')
const { request } = require('./fetch')

const BLOCKED_HTML_RE =
  /cf-turnstile|challenge-platform|just a moment|access denied|attention required/i

function getProxyMeta(userProxyUrl) {
  const url = (
    userProxyUrl ||
    config.proxy?.url ||
    process.env.PROXY_URL ||
    ''
  ).trim()
  const hasProxy = Boolean(url)
  return {
    useProxy: hasProxy && config.proxy?.enabled !== false,
    proxyUrl: hasProxy ? url : undefined,
  }
}

async function fetchTextOnce(url, options = {}, meta = {}) {
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
    const text = res.ok ? await res.text() : null
    return {
      status: res.status,
      text,
      blocked: text ? BLOCKED_HTML_RE.test(text) : false,
      via: meta.via || 'direct',
    }
  } catch (err) {
    return {
      status: 0,
      text: null,
      blocked: false,
      via: meta.via || 'direct',
      error: err.message,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchText(url, options = {}, meta = {}) {
  const first = await fetchTextOnce(url, options, meta)
  if (first.text && first.text.length > 800 && !first.blocked) {
    return first.text
  }

  if (config.scraperJinaFallback && !meta.skipJina) {
    const jinaUrl = `${config.scraperJinaBase || 'https://r.jina.ai/'}${url}`
    const jina = await fetchTextOnce(
      jinaUrl,
      options,
      { ...meta, useProxy: false, via: 'jina', skipJina: true }
    )
    if (jina.text && jina.text.length > 800 && !jina.blocked) {
      return jina.text
    }
  }

  return first.text && !first.blocked ? first.text : null
}

async function fetchTextWithMeta(url, options = {}, meta = {}) {
  const first = await fetchTextOnce(url, options, meta)
  if (first.text && first.text.length > 800 && !first.blocked) return first

  if (config.scraperJinaFallback && !meta.skipJina) {
    const jinaUrl = `${config.scraperJinaBase || 'https://r.jina.ai/'}${url}`
    const jina = await fetchTextOnce(jinaUrl, options, {
      ...meta,
      useProxy: false,
      via: 'jina',
      skipJina: true,
    })
    if (jina.text && jina.text.length > 800 && !jina.blocked) return jina
  }

  return first
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

module.exports = {
  fetchText,
  fetchTextWithMeta,
  fetchJson,
  getProxyMeta,
}
