const http = require('http')
const https = require('https')
const { PassThrough } = require('stream')

// Check if GM_xmlhttpRequest supports
const isTamperMonkeySupported = typeof GM_xmlhttpRequest === 'function'

// A multi-compatible http request,
// As the limitation of native browser's http,
// for example, the non-https request can't pass through the https protected site on Chrome
class HttpRequest extends PassThrough {
  constructor () {
    super()
    this.on('data', (chunk) => {
      if (this.req) {
        this.req.write(chunk)
      }
    })
    this.once('end', () => {
      if (this.req) {
        this.req.end()
      }
    })
  }

  abort () {
    if (this.req) {
      this.req.abort()
    }
  }

  request (opts, cb) {
    if (isTamperMonkeySupported) {
      opts.url = `${opts.protocol}//${opts.hostname}${opts.path}`
      opts.responseType = 'arraybuffer'
      opts.onerror = err => this.emit('error', err)
      opts.ontimeout = () => this.emit('timeout')
      opts.onloadstart = () => this.emit('socket')
      opts.onload = _res => {
        const res = new PassThrough()
        res.statusCode = _res['status']
        res.headers = _res['responseHeaders']
        cb(res)
        res.write(Buffer.from(_res['response']))
        res.end()
      }
      const req = new PassThrough()
      req.abort = () => { 
        if (req.request) { 
          req.request.abort()
        }
      }
      let body
      req.on('data', (data) => body = data)
      req.once('end', () => {
        if (body) {
          opts.data = body
        }
        // TamperMonkey Extension API of GM_xmlhttpRequest:
        //   https://www.tampermonkey.net/documentation.php#GM_xmlhttpRequest
        req.request = GM_xmlhttpRequest(opts)
      })
      this.req = req
    } else {
      // Support http/https urls
      const protocol = opts.protocol === 'https:' ? https : http
      const req = protocol.request(opts, cb)
      req.on('timeout', () => this.emit('timeout'))
      req.on('error', (err) => this.emit('error', err))
      req.on('socket', () => this.emit('socket'))
      this.req = req
    }
    return this
  }
}

module.exports = HttpRequest
