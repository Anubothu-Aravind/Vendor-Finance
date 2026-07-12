import { useState, useEffect } from 'react'
import api from '../utils/api'

export function useDashboardSummary() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSummary = async (signal) => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/summary', { signal })
      if (!signal || !signal.aborted) {
        setData(res)
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch dashboard summary')
      }
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchSummary(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchSummary()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  return { data, loading, error, refetch: fetchSummary }
}

export default useDashboardSummary
