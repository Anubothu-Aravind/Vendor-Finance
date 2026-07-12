let clients = []

function sseHandler(req, res) {
  // Set headers for Server-Sent Events stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  // Send initial comment to keep client connection active immediately
  res.write(': ok\n\n')

  const clientId = Date.now()
  const newClient = {
    id: clientId,
    res
  }
  clients.push(newClient)
  console.log(`[SSE] Client connected. Active clients: ${clients.length}`)

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId)
    console.log(`[SSE] Client disconnected. Active clients: ${clients.length}`)
  })
}

function broadcastEvent(type, data = {}) {
  console.log(`[SSE] Broadcasting event: ${type}`)
  clients.forEach(c => {
    c.res.write(`event: message\n`)
    c.res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  })
}

module.exports = { sseHandler, broadcastEvent }
