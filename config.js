/**
 * Kraken — agregador Stremio en español + addons upstream + debrid.
 */

module.exports = {
  addonName: 'Kraken',
  addonDescription:
    'Kraken: Peerflix, Torrentio, TorrentClaw e indexadores ES. Filtra español, ordena calidad y debrid.',

  /** Orden upstream en lista (tras indexadores web): Peerflix → Torrentio → TorrentClaw */
  upstreamOrder: ['peerflix', 'torrentio', 'torrentclaw'],

  /** Addons Stremio externos (proxy de streams) */
  upstreamAddons: [
    {
      id: 'peerflix',
      name: 'Peerflix',
      baseUrl: 'https://peerflix.mov',
      enabled: true,
      /** Peerflix no admite config en path; debrid en https://config.peerflix.mov */
      buildConfig() {
        return null
      },
    },
    {
      id: 'torrentio',
      name: 'Torrentio',
      baseUrl: 'https://torrentio.strem.fun',
      enabled: true,
      /** Segmentos de configuración en la URL (ver torrentio.strem.fun) */
      buildConfig(services) {
        const parts = [
          'language=spanish',
          'providers=mejortorrent,wolfmax4k,cinecalidad,bludv,micolachaodublado,comando,torrentgalaxy,1337x,rarbg,eztv,yts',
          'limit=12',
        ]
        if (services.realDebrid) parts.push(`realdebrid=${services.realDebrid}`)
        if (services.allDebrid) parts.push(`alldebrid=${services.allDebrid}`)
        return parts.join('|')
      },
    },
    {
      id: 'torrentclaw',
      name: 'TorrentClaw',
      baseUrl: 'https://torrentclaw.com/api/stremio',
      enabled: true,
      buildConfig(services) {
        const parts = ['language=spanish', 'limit=12']
        if (services.realDebrid) parts.push(`realdebrid=${services.realDebrid}`)
        if (services.allDebrid) parts.push(`alldebrid=${services.allDebrid}`)
        return parts.join('|')
      },
    },
  ],

  maxStreamsPerUpstream: 12,
  maxTotalStreams: 30,

  /** Caché en memoria (ms) — Cinemeta y upstream */
  cacheTtlMs: 15 * 60 * 1000,

  /** Stremio suele cancelar ~25–30s; reservar tiempo para indexadores + debrid */
  streamRequestTimeoutMs: 28000,
  /** Tiempo máximo esperando magnets en AllDebrid/Real-Debrid */
  debridMagnetWaitMs: 14000,
  /** Scrapers en paralelo (lotes) */
  scrapeConcurrency: 8,
  scrapeTimeoutMs: 12000,

  /**
   * Si hay N enlaces directos de upstream, omitir scraping local.
   * 0 = nunca omitir (siempre buscar en indexadores web).
   */
  fastPathMinDirectStreams: 0,

  /** Excluir calidades basura de la lista final */
  excludeQualities: [/\bcam\b/i, /telesync/i, /\bts\b/i, /hdts/i, /scr\b/i],

  /**
   * Proxy / VPN (Riseup, Tor, etc.)
   *
   * Riseup VPN (gratis): instala Bitmask → conecta "Riseup" → todo el PC
   * usa el túnel. No hace falta URL aquí si arrancas npm start con VPN activa.
   *
   * Si Bitmask expone SOCKS local, pon url: 'socks5://127.0.0.1:8080'
   * o variable de entorno PROXY_URL.
   */
  proxy: {
    enabled: true,
    url: process.env.PROXY_URL || '',
    /** Por defecto debrid va DIRECTO (Real-Debrid suele fallar detrás de VPN) */
    useForDebrid: process.env.PROXY_DEBRID === 'true',
    useForCinemeta: false,
  },

  torrentSites: [
    {
      name: 'DivxTotal',
      baseUrl: 'https://divxtotal.foo',
      searchUrl: 'https://divxtotal.foo/?s={query}',
      enabled: true,
    },
    {
      name: 'GranTorrent',
      baseUrl: 'https://grantorrent.zip',
      searchUrl: 'https://grantorrent.zip/?s={query}',
      enabled: true,
    },
    {
      name: 'MejorTorrent',
      baseUrl: 'https://www43.mejortorrent.eu',
      searchUrl: 'https://www43.mejortorrent.eu/?page=buscar&s={query}',
      enabled: true,
    },
    {
      name: 'DonTorrent',
      baseUrl: 'https://dontorrent.wf',
      searchUrl: 'https://dontorrent.wf/buscar?buscar={query}',
      enabled: true,
    },
    {
      name: 'EliteTorrent',
      baseUrl: 'https://www.elitetorrent.com',
      searchUrl: 'https://www.elitetorrent.com/?s={query}',
      enabled: true,
    },
    {
      name: 'NewPCT',
      baseUrl: 'https://www.newpct.com',
      searchUrl: 'https://www.newpct.com/?s={query}',
      enabled: true,
    },
    {
      name: 'ZonaTorrent',
      baseUrl: 'https://www.zonatorrent.org',
      searchUrl: 'https://www.zonatorrent.org/?s={query}',
      enabled: true,
    },
    {
      name: 'TorrentLocura',
      baseUrl: 'https://torrentlocura.com',
      searchUrl: 'https://torrentlocura.com/?s={query}',
      enabled: true,
    },
    {
      name: 'PedroTorrent',
      baseUrl: 'https://pedrotorrent.com',
      searchUrl: 'https://pedrotorrent.com/?s={query}',
      enabled: true,
    },
    {
      name: 'Tomadivx',
      baseUrl: 'https://www.tomadivx.net',
      searchUrl: 'https://www.tomadivx.net/?s={query}',
      enabled: true,
    },
    {
      name: 'MeGustaTorrent',
      baseUrl: 'https://www.megustatorrent.net',
      searchUrl: 'https://www.megustatorrent.net/?s={query}',
      enabled: true,
    },
    {
      name: 'Subtorrents',
      baseUrl: 'https://www.subtorrents.com',
      searchUrl: 'https://www.subtorrents.com/index.php?buscar={query}',
      enabled: true,
    },
    {
      name: 'Torrenflix',
      baseUrl: 'https://www.torrenflix.net',
      searchUrl: 'https://www.torrenflix.net/?s={query}',
      enabled: true,
    },
    {
      name: 'Mejorenlatino',
      baseUrl: 'https://www.mejorenlatino.com',
      searchUrl: 'https://www.mejorenlatino.com/?s={query}',
      enabled: true,
    },
    {
      name: 'Cinecalidad',
      baseUrl: 'https://www.cinecalidad.ec',
      searchUrl: 'https://www.cinecalidad.ec/?s={query}',
      enabled: true,
    },
    {
      name: 'Comando',
      baseUrl: 'https://comando.nu',
      searchUrl: 'https://comando.nu/?s={query}',
      enabled: true,
    },
    {
      name: 'BluDV',
      baseUrl: 'https://bludv.net',
      searchUrl: 'https://bludv.net/?s={query}',
      enabled: true,
    },
    {
      name: 'Wolfmax4k',
      baseUrl: 'https://wolfmax4k.com',
      searchUrl: 'https://wolfmax4k.com/?s={query}',
      enabled: true,
    },
    {
      name: 'EstrenosDTL',
      baseUrl: 'https://www.estrenosdtl.la',
      searchUrl: 'https://www.estrenosdtl.la/?s={query}',
      enabled: true,
    },
    {
      name: 'Mitorrent',
      baseUrl: 'https://www.mitorrent.biz',
      searchUrl: 'https://www.mitorrent.biz/?s={query}',
      enabled: true,
    },
    {
      name: 'TorrentPelis',
      baseUrl: 'https://www.torrentpelis.org',
      searchUrl: 'https://www.torrentpelis.org/?s={query}',
      enabled: true,
    },
    {
      name: 'CalidadHD',
      baseUrl: 'https://calidadhd.com',
      searchUrl: 'https://calidadhd.com/?s={query}',
      enabled: true,
    },
    {
      name: 'UnionPeliculas',
      baseUrl: 'https://www.unionpeliculas.com',
      searchUrl: 'https://www.unionpeliculas.com/?s={query}',
      enabled: true,
    },
    {
      name: 'Latinotorrent',
      baseUrl: 'https://www.latinotorrent.com',
      searchUrl: 'https://www.latinotorrent.com/?s={query}',
      enabled: true,
    },
    {
      name: 'Hackstore',
      baseUrl: 'https://www.hackstore.tv',
      searchUrl: 'https://www.hackstore.tv/?s={query}',
      enabled: true,
    },
    {
      name: 'PoseidonHD',
      baseUrl: 'https://www.poseidonhd.com',
      searchUrl: 'https://www.poseidonhd.com/?s={query}',
      enabled: true,
    },
    {
      name: 'MicoLeaoDublado',
      baseUrl: 'https://microlatino.com',
      searchUrl: 'https://microlatino.com/?s={query}',
      enabled: true,
    },
  ],

  maxDetailPagesPerSite: 3,
  maxMagnetsToDebrid: 8,
  maxIndexerDebridAttempts: 6,
  maxP2PStreams: 10,
  requestTimeoutMs: 20000,

  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  language: {
    include: [
      'spanish',
      'español',
      'espanol',
      'castellano',
      'latino',
      'spanis',
      'dual audio',
      'doblaje',
      'newpct',
      'hdespanol',
      'microhd',
      'scenerls',
      'microlatino',
      'wolfmax',
      'cinecalidad',
      'dontorrent',
      'mejortorrent',
      'tomadivx',
      'megusta',
      'subtorrents',
      'torrenflix',
      'mejorenlatino',
      'comando',
      'bludv',
      'wolfmax',
      'estrenosdtl',
      'mitorrent',
      'torrentpelis',
      'calidadhd',
      'unionpeliculas',
      'latinotorrent',
      'hackstore',
      'poseidon',
      'microlatino',
      'micoleao',
      'pedrotorrent',
      'grantorrent',
      'elitetorrent',
      'zonatorrent',
    ],
    exclude: [
      ' english',
      ' ingles',
      ' inglés',
      ' eng ',
      '.eng.',
      'multi.eng',
      ' v.o',
      'vo ',
      ' vf ',
    ],
    allowUnknown: true,
  },

  sort: {
    resolutions: [
      { re: /2160p|4k|uhd/i, score: 100 },
      { re: /1080p/i, score: 85 },
      { re: /720p/i, score: 65 },
      { re: /480p|dvdrip/i, score: 40 },
    ],
    qualities: [
      { re: /remux|blu-?ray|bdrip/i, score: 25 },
      { re: /web-?dl|webrip/i, score: 18 },
      { re: /hdtv/i, score: 10 },
      { re: /cam|ts|telesync/i, score: -50 },
    ],
  },
}
