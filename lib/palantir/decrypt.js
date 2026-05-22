/**
 * Descifrado de enlaces moria (Resolver en libs/ioOOO0oo).
 * link en BD -> base64.urlsafe_b64decode -> AES-256-OFB.
 */
const crypto = require('crypto')

const AES_KEY_B64 =
  'hTh8uRnL5bX8PZC6Tc3t46nVDFfBpB6Tjw3qazQThpexpg8bLdimevNHj5vJR0nP'

function getAesOfbCipher() {
  const raw = Buffer.from(AES_KEY_B64, 'base64')
  const key = raw.subarray(16)
  const iv = raw.subarray(0, 16)
  return crypto.createDecipheriv('aes-256-ofb', key, iv)
}

/**
 * @param {string} encLink valor columna `link` en enlaces_pelis / enlaces_series
 * @returns {string} URL hoster (p. ej. https://1fichier.com/?...)
 */
function decryptPalantirLink(encLink) {
  const s = String(encLink).trim()
  if (/^https?:\/\//i.test(s)) return s

  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)

  const ct = Buffer.from(b64, 'base64')
  const dec = getAesOfbCipher()
  const pt = Buffer.concat([dec.update(ct), dec.final()])
  return pt.toString('utf8')
}

module.exports = { decryptPalantirLink, AES_KEY_B64 }
