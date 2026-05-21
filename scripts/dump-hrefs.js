const fs = require('fs')
const { fetchText } = require('../lib/http')
const url = process.argv[2]
fetchText(url).then((h) => {
  const re = /href=["']([^"']+)["']/gi
  const a = []
  let m
  while ((m = re.exec(h))) a.push(m[1])
  fs.writeFileSync('tmp-hrefs.txt', a.join('\n'))
  console.log('hrefs', a.length)
})
