import { useEffect } from 'react'
import { API_BASE_URL } from '../utils/api'

export function useSSE() {
  useEffect(() => {
    const sseUrl = `${API_BASE_URL}/events`
    let eventSource = null
    let isMounted = true
    let reconnectTimeout = null

    function connect() {
      if (!isMounted) return

      try {
        eventSource = new EventSource(sseUrl, { withCredentials: true })

        eventSource.onopen = () => {
          // Connection opened / restored
        }

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            if (payload.type === 'data-changed') {
              // Broadcast window-wide data refresh event to active pages & components
              const customEvent = new CustomEvent('api-data-changed', { detail: payload.data })
              window.dispatchEvent(customEvent)
            }
          } catch {
            // Ignored for comments / heartbeat pings
          }
        }

        eventSource.onerror = () => {
          if (!isMounted) return

          // If the browser is in the middle of native auto-reconnect (readyState === CONNECTING),
          // let EventSource handle it naturally without recreating instances.
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            eventSource.close()
            eventSource = null

            // Retry connection after a controlled 5s delay
            clearTimeout(reconnectTimeout)
            reconnectTimeout = setTimeout(() => {
              if (isMounted) connect()
            }, 5000)
          }
        }
      } catch (err) {
        // Fallback retry if initial construction throws
        clearTimeout(reconnectTimeout)
        reconnectTimeout = setTimeout(() => {
          if (isMounted) connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
    }
  }, [])
}

export default useSSE
