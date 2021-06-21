const http = require('http')
const https = require('https')
global.GM_xmlhttpRequest = function (opts) {
  const protocol = opts.protocol === 'https:' ? https : http
  const req = protocol.request(opts, res => {
    const chunks = []
    res.on('data', chunk => chunks.push(chunk))
    res.on('end', () => {
      opts.onload({
        status: res.statusCode,
        responseHeaders: res.headers,
        response: Buffer.concat(chunks)
      })
    })
  })
  req.on('socket', () => opts.onloadstart())
  req.on('timeout', () => opts.ontimeout())
  req.on('error', err => opts.onerror(err))
  req.end(opts.data)
  return req
}
