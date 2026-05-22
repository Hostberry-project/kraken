const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
const { getRouter } = require('stremio-addon-sdk')
const { getConfigureOptions } = require('./configureOptions')

/**
 * Servidor HTTP del addon (0.0.0.0 por defecto; en Linux usa 127.0.0.1 en Stremio).
 */
function startKrakenServer(addonInterface, opts = {}) {
  const port = opts.port || 7000
  const host = opts.host || process.env.KRAKEN_HOST || '0.0.0.0'
  const cacheMaxAge = opts.cacheMaxAge || 60
  const manifest = addonInterface.manifest

  const app = express()

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
    })
  )
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    if (req.method === 'OPTIONS') return res.status(204).end()
    if (cacheMaxAge && !res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', `max-age=${cacheMaxAge}, public`)
    }
    next()
  })

  app.get('/health.json', (_, res) => {
    let moria = null
    try {
      const moriaEnsure = require('./palantir/moriaEnsure')
      moria = moriaEnsure.getMoriaStatus()
      if (!moria.ready && !moria.preparing) {
        moriaEnsure.scheduleMoriaPrepare()
        moria = moriaEnsure.getMoriaStatus()
      }
    } catch (e) {
      moria = { error: e.message }
    }
    res.json({
      ok: true,
      name: manifest.name,
      version: manifest.version,
      moria,
    })
  })

  const manifestJson = JSON.stringify(manifest)
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(manifestJson)
  })

  app.use(getRouter(addonInterface))

  const publicDir = path.join(process.cwd(), opts.static || 'public')
  if (opts.static && fs.existsSync(publicDir)) {
    app.use(opts.static, express.static(publicDir))
  }

  const hasConfig = !!(manifest.config || []).length
  const configurePath = path.join(publicDir, 'configure.html')

  app.get('/api/configure-options.json', (_, res) => {
    res.json(getConfigureOptions())
  })

  app.get('/', (_, res) => {
    if (hasConfig) res.redirect('/configure')
    else res.redirect('/index.html')
  })

  if (hasConfig && fs.existsSync(configurePath)) {
    app.get('/configure', (_, res) => {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      fs.createReadStream(configurePath).pipe(res)
    })
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const url = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/manifest.json`
      resolve({ url, server, port, host })
    })
    server.on('error', reject)
  })
}

module.exports = { startKrakenServer }
