#!/usr/bin/env node
/**
 * Kraken Stremio addon
 * Copyright (C) 2026 Kraken Stremio contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const fs = require('fs')
const path = require('path')

// El SDK une process.cwd() + static; hay que ejecutar desde la carpeta del proyecto
const projectRoot = __dirname
if (process.cwd() !== projectRoot) {
  process.chdir(projectRoot)
}

const { addonBuilder } = require('stremio-addon-sdk')
const { startKrakenServer } = require('./lib/server')
const config = require('./config')
const { buildStreams } = require('./lib/streams')
const { getDebridServices, hasAnyDebrid } = require('./lib/debrid')
const { hasEnabledUpstream, parseUserConfig } = require('./lib/userConfig')

const builder = new addonBuilder({
  id: 'org.stremio.kraken',
  version: '4.0.0',
  name: config.addonName,
  description: config.addonDescription,
  logo: 'https://www.stremio.com/website/stremio-logo-small.png',
  catalogs: [],
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
  config: [
    {
      key: 'debridApiKey',
      type: 'password',
      title: 'Real-Debrid API (recomendado)',
      required: false,
    },
    {
      key: 'alldebridApiKey',
      type: 'password',
      title: 'AllDebrid API (opcional)',
      required: false,
    },
    {
      key: 'soloEspanol',
      type: 'checkbox',
      title: 'Filtrar solo español / castellano / latino',
      default: 'checked',
    },
    {
      key: 'enablePeerflix',
      type: 'checkbox',
      title: 'Incluir Peerflix (prioridad)',
      default: 'checked',
    },
    {
      key: 'enableTorrentio',
      type: 'checkbox',
      title: 'Incluir Torrentio',
      default: 'checked',
    },
    {
      key: 'enableTorrentClaw',
      type: 'checkbox',
      title: 'Incluir TorrentClaw',
      default: 'checked',
    },
    {
      key: 'enabledSites',
      type: 'text',
      title: 'Indexadores activos (interno)',
      default:
        'DivxTotal,GranTorrent,MejorTorrent,DonTorrent,EliteTorrent,NewPCT,ZonaTorrent,TorrentLocura,PedroTorrent',
    },
    {
      key: 'proxyUrl',
      type: 'text',
      title: 'Proxy SOCKS5/HTTP (opcional, ej. socks5://127.0.0.1:8080)',
      required: false,
    },
  ],
})

builder.defineStreamHandler(async function (args) {
  const { type, id, config: userConfig } = args

  if (!id || !String(id).startsWith('tt')) {
    return { streams: [] }
  }

  if (type !== 'movie' && type !== 'series') {
    return { streams: [] }
  }

  const cfg = userConfig || {}
  const userOpts = parseUserConfig(cfg)
  const services = getDebridServices(cfg)

  if (!hasAnyDebrid(services) && !hasEnabledUpstream(userOpts)) {
    return {
      streams: [
        {
          name: 'Kraken',
          title: 'Activa Peerflix/Torrentio/TorrentClaw o añade API debrid',
          externalUrl: 'https://real-debrid.com/apitoken',
        },
      ],
    }
  }

  try {
    const streams = await buildStreams(type, id, cfg)
    return { streams }
  } catch (err) {
    console.error('[Kraken]', err.message)
    if (err.message?.includes('timeout')) {
      return {
        streams: [
          {
            name: 'Kraken',
            title: 'Tiempo agotado; reduce fuentes o reintenta',
            externalUrl: 'http://127.0.0.1:7000/',
          },
        ],
      }
    }
    return { streams: [] }
  }
})

const port = Number(process.env.PORT) || 7000

function getManifestUrls() {
  const urls = []
  if (process.env.FLY_APP_NAME) {
    urls.push(`https://${process.env.FLY_APP_NAME}.fly.dev/manifest.json`)
  }
  if (process.env.PUBLIC_URL) {
    urls.push(`${process.env.PUBLIC_URL.replace(/\/$/, '')}/manifest.json`)
  }
  urls.push(`http://127.0.0.1:${port}/manifest.json`)
  try {
    const { getLanUrls } = require('./lib/network')
    for (const u of getLanUrls(port)) {
      if (!urls.includes(u)) urls.push(u)
    }
  } catch {
    /* ignore */
  }
  return urls
}

const publicDir = path.join(projectRoot, 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

startKrakenServer(builder.getInterface(), {
  port,
  host: process.env.KRAKEN_HOST || '0.0.0.0',
  cacheMaxAge: 60,
  static: 'public',
})
  .then(({ url }) => {
    console.log('HTTP addon accessible at:', url)
    const urls = getManifestUrls()
    if (urls[0] !== url) console.log('Manifest URLs:', urls.join(' | '))
  })
  .catch((err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Puerto', port, 'ocupado.')
      process.exit(1)
    }
    throw err
  })

const upstreamNames = config.upstreamAddons
  .filter((a) => a.enabled)
  .map((a) => a.name)
const siteNames = config.torrentSites.filter((s) => s.enabled).map((s) => s.name)

console.log('')
console.log('  Kraken v4.0')
const { resolveProxyUrl } = require('./lib/fetch')
if (resolveProxyUrl()) console.log(`  Proxy: ${resolveProxyUrl()}`)
else console.log('  Proxy: no (VPN de sistema si esta conectada)')
const manifestUrls = getManifestUrls()
const primary = manifestUrls[0]
console.log('')
console.log('  Manifest (Stremio):')
for (const u of manifestUrls) console.log('   ', u)
console.log('  Configurar:        ', primary.replace('/manifest.json', '/configure'))
if (process.env.FLY_APP_NAME) console.log('  Fly.io:             fly logs | fly apps open')
console.log('')
