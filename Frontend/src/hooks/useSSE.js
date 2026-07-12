import { useEffect } from 'react'

export function useSSE() {
  useEffect(() => {
    // Exclude setup, login, and error pages from SSE connection if desired, 
    // but running globally inside layout ensures active connection for dashboard/pages.
    const isLocal = window.location.hostname === 'localhost'
    
    // Construct absolute or relative URL for EventSource
    const sseUrl = '/api/events'
    console.log('[SSE] Connecting to event stream at:', sseUrl)
    
    let eventSource
    try {
      eventSource = new EventSource(sseUrl)

      eventSource.onopen = () => {
        console.log('[SSE] Connection opened successfully.')
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          console.log('[SSE] Received event payload:', payload)
          
          if (payload.type === 'data-changed') {
            // Broadcast custom window-wide event
            const customEvent = new CustomEvent('api-data-changed', { detail: payload.data })
            window.dispatchEvent(customEvent)
          }
        } catch (err) {
          console.error('[SSE] Failed to parse message data:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection encountered an error or disconnected:', err)
      }
    } catch (err) {
      console.error('[SSE] Failed to instantiate EventSource:', err)
    }

    return () => {
      if (eventSource) {
        console.log('[SSE] Closing connection.')
        eventSource.close()
      }
    }
  }, [])
}

export default useSSE
