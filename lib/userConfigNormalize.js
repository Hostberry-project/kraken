/** Stremio a veces envía config=false si el JSON en la URL falla. */
function normalizeUserConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return {}
  return cfg
}

module.exports = { normalizeUserConfig }
