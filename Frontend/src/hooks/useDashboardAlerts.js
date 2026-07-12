import { useState, useEffect } from 'react'
import api from '../utils/api'

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAlerts = async (signal) => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/alerts', { signal })
      if (!signal || !signal.aborted) {
        setAlerts(res)
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch dashboard alerts')
      }
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchAlerts(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchAlerts()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  return { alerts, loading, error, refetch: fetchAlerts }
}

export default useDashboardAlerts
