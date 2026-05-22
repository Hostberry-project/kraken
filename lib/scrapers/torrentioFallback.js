/**
 * Cuando el scraping directo falla (p. ej. IP de Fly.io bloqueada),
 * reutiliza streams de Torrentio etiquetados por proveedor (⚙️ Comando, etc.).
 */

const PROVIDER_TO_SITE = {
  mejortorrent: 'MejorTorrent',
  'mejor torrent': 'MejorTorrent',
  mejortorrents: 'MejorTorrent',
  wolfmax4k: 'Wolfmax4k',
  wolfmax: 'Wolfmax4k',
  cinecalidad: 'Cinecalidad',
  bludv: 'BluDV',
  micolachaodublado: 'MicoLeaoDublado',
  micoleao: 'MicoLeaoDublado',
  'mico leao': 'MicoLeaoDublado',
  comando: 'Comando',
  torrenflix: 'Torrenflix',
  mejorenlatino: 'Mejorenlatino',
  dontorrent: 'DonTorrent',
  elitetorrent: 'EliteTorrent',
  newpct: 'NewPCT',
  zonatorrent: 'ZonaTorrent',
  grantorrent: 'GranTorrent',
  divxtotal: 'DivxTotal',
  pedrotorrent: 'PedroTorrent',
  tomadivx: 'Tomadivx',
  megustatorrent: 'MeGustaTorrent',
  subtorrents: 'Subtorrents',
  estrenosdtl: 'EstrenosDTL',
  mitorrent: 'Mitorrent',
  torrentpelis: 'TorrentPelis',
  calidadhd: 'CalidadHD',
  unionpeliculas: 'UnionPeliculas',
  latinotorrent: 'Latinotorrent',
  hackstore: 'Hackstore',
  poseidonhd: 'PoseidonHD',
  poseidon: 'PoseidonHD',
}

function normProvider(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function providerFromStream(stream) {
  const text = [stream.name, stream.title, stream.description]
    .filter(Boolean)
    .join('\n')
  const gear = text.match(/⚙️\s*([^\n\r|]+)/)
  if (gear) return normProvider(gear[1])
  const plain = text.match(/\b(?:provider|fuente|source)\s*:\s*([^\n\r|]+)/i)
  if (plain) return normProvider(plain[1])
  return ''
}

function siteNameForProvider(key) {
  if (!key) return null
  if (PROVIDER_TO_SITE[key]) return PROVIDER_TO_SITE[key]
  const compact = key.replace(/\s+/g, '')
  if (PROVIDER_TO_SITE[compact]) return PROVIDER_TO_SITE[compact]
  return null
}

function streamLabel(stream) {
  return [stream.title, stream.name, stream.behaviorHints?.filename]
    .filter(Boolean)
    .join(' ')
}

function extractTorrentioIndexerCandidates(torrentioStreams, enabledSiteNames) {
  const enabled =
    enabledSiteNames instanceof Set
      ? enabledSiteNames
      : new Set(enabledSiteNames || [])
  const out = []
  const seen = new Set()

  for (const stream of torrentioStreams) {
    const provider = providerFromStream(stream)
    const site = siteNameForProvider(provider)
    if (!site || !enabled.has(site)) continue

    const hash = stream.infoHash?.toLowerCase()
    if (!hash || seen.has(`${site}:${hash}`)) continue
    seen.add(`${site}:${hash}`)

    out.push({
      magnet: `magnet:?xt=urn:btih:${hash}`,
      label: streamLabel(stream),
      source: site,
      torrentUrl: null,
      infoHash: hash,
      fileIdx: stream.fileIdx,
      viaTorrentio: true,
    })
  }

  return out
}

module.exports = {
  extractTorrentioIndexerCandidates,
  providerFromStream,
  siteNameForProvider,
}
