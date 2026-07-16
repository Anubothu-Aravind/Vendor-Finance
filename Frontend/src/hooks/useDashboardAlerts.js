import { useReducer, useEffect, useCallback } from 'react'
import api from '../utils/api'

// ── Reducer ───────────────────────────────────────────────────────────────────
// Consolidates alerts, loading, and error into a single state object.
// This prevents impossible intermediate states and ensures all three values
// transition atomically on every fetch cycle.
const initialState = { status: 'idle', alerts: [], error: null }

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, status: 'loading', error: null }
    case 'FETCH_SUCCESS':
      return { status: 'success', alerts: action.payload, error: null }
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.payload }
    default:
      return state
  }
}

export function useDashboardAlerts() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchAlerts = useCallback(async (signal) => {
    dispatch({ type: 'FETCH_START' })
    try {
      const res = await api.get('/dashboard/alerts', signal ? { signal } : {})
      if (!signal || !signal.aborted) {
        dispatch({ type: 'FETCH_SUCCESS', payload: res })
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        dispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch dashboard alerts' })
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAlerts(controller.signal)
    return () => controller.abort()
  }, [fetchAlerts])

  useEffect(() => {
    const handleDataChanged = () => fetchAlerts()
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [fetchAlerts])

  return {
    alerts:  state.alerts,
    loading: state.status === 'loading' || state.status === 'idle',
    error:   state.error,
    refetch: fetchAlerts
  }
}

export default useDashboardAlerts
