import { useContext } from 'react'
import { ConfirmationDialogContext } from '../components/ui/ConfirmationDialogContext'

export function useConfirm() {
  const ctx = useContext(ConfirmationDialogContext)
  if (!ctx) {
    // Fail gracefully by falling back to native confirm dialog if provider is not present
    console.warn('[useConfirm] Must be used inside <ConfirmationDialogProvider>. Falling back to native confirm.')
    return async (message) => window.confirm(message)
  }
  return ctx
}

export default useConfirm
