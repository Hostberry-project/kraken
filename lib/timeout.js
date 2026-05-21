function withTimeout(promise, ms, label = 'operación') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout: ${label} (${ms}ms)`)), ms)
    ),
  ])
}

module.exports = { withTimeout }
