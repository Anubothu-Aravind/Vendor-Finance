import { useState, useEffect } from 'react'
import api from '../utils/api'

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/alerts')
      setAlerts(res)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  return { alerts, loading, error, refetch: fetchAlerts }
}

export default useDashboardAlerts
