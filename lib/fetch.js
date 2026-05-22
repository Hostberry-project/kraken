/**
 * Fetch centralizado con proxy opcional (SOCKS5/HTTP).
 * Riseup VPN: mejor conectar Bitmask a nivel de sistema; si Bitmask
 * expone SOCKS local, usa PROXY_URL=socks5://127.0.0.1:8080
 */

const { fetch: undiciFetch, ProxyAgent } = require('undici')

let cachedDispatcher = undefined
let cachedProxyUrl = null

function resolveProxyUrl(override) {
  return (
    override ||
    process.env.PROXY_URL ||
    process.env.SOCKS_PROXY ||
    process.env.ALL_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    ''
  ).trim()
}

function getDispatcher(proxyUrl) {
  const url = resolveProxyUrl(proxyUrl)
  if (!url) return null

  if (cachedDispatcher !== undefined && cachedProxyUrl === url) {
    return cachedDispatcher
  }

  try {
    cachedDispatcher = new ProxyAgent(url)
    cachedProxyUrl = url
    const safe = url.replace(/\/\/([^:@]+):([^@]+)@/, '//$1:***@')
    console.log(`[proxy] Tráfico de indexadores/upstream vía ${safe}`)
    return cachedDispatcher
  } catch (err) {
    console.warn('[proxy] URL no válida:', err.message)
    cachedDispatcher = null
    cachedProxyUrl = url
    return null
  }
}

function resetProxyCache() {
  cachedDispatcher = undefined
  cachedProxyUrl = null
}

/**
 * @param {string} url
 * @param {object} options
 * @param {{ useProxy?: boolean, proxyUrl?: string }} meta
 */
async function request(url, options = {}, meta = {}) {
  const useProxy = meta.useProxy !== false
  const dispatcher = useProxy ? getDispatcher(meta.proxyUrl) : null
  const opts = { ...options }
  if (dispatcher) opts.dispatcher = dispatcher

  return undiciFetch(url, opts)
}

module.exports = { request, getDispatcher, resolveProxyUrl, resetProxyCache }
