import { useReducer, useEffect, useCallback } from 'react'
import api from '../utils/api'

// ── Reducer ───────────────────────────────────────────────────────────────────
// Consolidates data, loading, and error into a single state object.
// This prevents impossible intermediate states (e.g. loading=false with no data
// and no error) and ensures all three values transition atomically.
const initialState = { status: 'idle', data: null, error: null }

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, status: 'loading', error: null }
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload, error: null }
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.payload }
    default:
      return state
  }
}

export function useDashboardSummary() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchSummary = useCallback(async (signal) => {
    dispatch({ type: 'FETCH_START' })
    try {
      const res = await api.get('/dashboard/summary', signal ? { signal } : {})
      if (!signal || !signal.aborted) {
        dispatch({ type: 'FETCH_SUCCESS', payload: res })
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        dispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch dashboard summary' })
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSummary(controller.signal)
    return () => controller.abort()
  }, [fetchSummary])

  useEffect(() => {
    const handleDataChanged = () => fetchSummary()
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [fetchSummary])

  return {
    data:    state.data,
    loading: state.status === 'loading' || state.status === 'idle',
    error:   state.error,
    refetch: fetchSummary
  }
}

export default useDashboardSummary
