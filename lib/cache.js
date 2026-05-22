const store = new Map()

function get(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    store.delete(key)
    return null
  }
  return entry.value
}

function set(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs })
}

function clear() {
  store.clear()
}

module.exports = { get, set, clear }
