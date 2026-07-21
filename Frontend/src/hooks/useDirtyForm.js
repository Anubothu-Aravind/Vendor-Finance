import { useEffect, useRef, useCallback } from 'react'
import { useDirtyStateContext } from '../context/DirtyStateContext'

export function useDirtyForm({
  id,
  title = 'Form',
  isDirty = false,
  onSave,
  onDiscard,
  autoSave = false,
  priority = 0,
  elementRef = null,
}) {
  const { registerForm, unregisterForm, setFormDirty, confirmNavigation } = useDirtyStateContext()
  const onSaveRef = useRef(onSave)
  const onDiscardRef = useRef(onDiscard)

  useEffect(() => {
    onSaveRef.current = onSave
    onDiscardRef.current = onDiscard
  })

  // Stable save wrapper
  const handleSave = useCallback(async () => {
    if (onSaveRef.current) {
      return await onSaveRef.current()
    }
  }, [])

  // Stable discard wrapper
  const handleDiscard = useCallback(() => {
    if (onDiscardRef.current) {
      onDiscardRef.current()
    }
  }, [])

  // Register form with registry on mount
  useEffect(() => {
    registerForm({
      id,
      title,
      isDirty,
      save: handleSave,
      discard: handleDiscard,
      autoSave,
      priority,
      element: elementRef?.current || null,
    })

    return () => {
      unregisterForm(id)
    }
  }, [id, title, registerForm, unregisterForm, handleSave, handleDiscard, autoSave, priority, elementRef])

  // Sync dirty status whenever `isDirty` prop changes
  useEffect(() => {
    setFormDirty(id, isDirty)
  }, [id, isDirty, setFormDirty])

  // Keyboard shortcut: Ctrl+S to save, ESC to trigger confirmation guard when dirty
  useEffect(() => {
    if (!isDirty) return

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        confirmNavigation(handleDiscard)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isDirty, handleSave, handleDiscard, confirmNavigation])

  return {
    isDirty,
    markClean: () => setFormDirty(id, false),
    markDirty: () => setFormDirty(id, true),
  }
}
