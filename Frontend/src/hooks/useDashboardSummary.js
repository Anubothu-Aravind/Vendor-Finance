import { useState, useEffect } from 'react'
import api from '../utils/api'

export function useDashboardSummary() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/summary')
      setData(res)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  return { data, loading, error, refetch: fetchSummary }
}

export default useDashboardSummary
