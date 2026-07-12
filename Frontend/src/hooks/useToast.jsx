import { useContext } from 'react'
import { ToastContext } from '../components/ui/ToastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fail gracefully — don't crash the component tree if provider is missing
    // (can happen during HMR hot-reload before App re-mounts)
    console.error('[useToast] Must be used inside <ToastProvider>. Falling back to console.')
    return (message, type = 'info') => console.warn(`[Toast fallback] ${type}: ${message}`)
  }
  return ctx
}

export default useToast
