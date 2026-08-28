let clients = []

function sseHandler(req, res) {
  // Disable socket timeouts for long-lived SSE stream
  if (req.socket) {
    req.socket.setTimeout(0)
    req.socket.setNoDelay(true)
    req.socket.setKeepAlive(true, 15000)
  }

  // Set headers for Server-Sent Events stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  // Flush initial headers immediately
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }

  // Instruct client on reconnection interval & send initial ping
  res.write('retry: 5000\n\n')
  res.write(': ok\n\n')

  const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const newClient = {
    id: clientId,
    res
  }
  clients.push(newClient)

  // 20-second heartbeat to prevent proxy idle connection drop (Render / Cloudflare / Nginx)
  const heartbeatTimer = setInterval(() => {
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.write(': heartbeat\n\n')
        if (typeof res.flush === 'function') {
          res.flush()
        }
      } else {
        cleanup()
      }
    } catch {
      cleanup()
    }
  }, 20000)

  let cleanedUp = false
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    clearInterval(heartbeatTimer)
    clients = clients.filter(c => c.id !== clientId)
  }

  req.on('close', cleanup)
  req.on('end', cleanup)
  res.on('error', cleanup)
  res.on('finish', cleanup)
}

function broadcastEvent(type, data = {}) {
  clients = clients.filter(c => c.res && !c.res.writableEnded && !c.res.destroyed)
  clients.forEach(c => {
    try {
      if (!c.res.writableEnded && !c.res.destroyed) {
        c.res.write(`event: message\n`)
        c.res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
        if (typeof c.res.flush === 'function') {
          c.res.flush()
        }
      }
    } catch (err) {
      console.error('[SSE] Failed to write event to client:', err.message)
    }
  })
}

module.exports = { sseHandler, broadcastEvent }
