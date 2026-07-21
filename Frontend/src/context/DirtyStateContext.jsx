import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const DirtyStateContext = createContext(null)

export function DirtyStateProvider({ children }) {
  // Map of formId -> DirtyForm config
  const [dirtyFormsMap, setDirtyFormsMap] = useState(() => new Map())
  const dirtyFormsRef = useRef(new Map())
  
  // Confirmation dialog UI state
  const [dialogConfig, setDialogConfig] = useState(null)
  const resolverRef = useRef(null)

  // Register a form with the registry
  const registerForm = useCallback((formConfig) => {
    const { id, title = 'Form', isDirty = false, save, discard, autoSave = false, element = null, priority = 0 } = formConfig
    const item = { id, title, isDirty, save, discard, autoSave, element, priority }
    dirtyFormsRef.current.set(id, item)
    setDirtyFormsMap(prev => {
      const next = new Map(prev)
      next.set(id, item)
      return next
    })
  }, [])

  // Unregister form
  const unregisterForm = useCallback((id) => {
    dirtyFormsRef.current.delete(id)
    setDirtyFormsMap(prev => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Update dirty status of a registered form
  const setFormDirty = useCallback((id, isDirty) => {
    const existing = dirtyFormsRef.current.get(id)
    if (existing) {
      existing.isDirty = isDirty
    }
    setDirtyFormsMap(prev => {
      const item = prev.get(id)
      if (!item || item.isDirty === isDirty) return prev
      const next = new Map(prev)
      next.set(id, { ...item, isDirty })
      return next
    })
  }, [])

  // Get active dirty forms array sorted by priority
  const dirtyFormsList = Array.from(dirtyFormsMap.values())
    .filter(f => f.isDirty)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))

  const dirtyCount = dirtyFormsList.length

  // Save all active dirty forms
  const saveAllDirtyForms = useCallback(async () => {
    const activeDirty = Array.from(dirtyFormsRef.current.values()).filter(f => f.isDirty)
    let allSuccessful = true

    for (const form of activeDirty) {
      if (form.save) {
        try {
          const res = await form.save()
          if (res === false) {
            allSuccessful = false
          } else {
            setFormDirty(form.id, false)
          }
        } catch (err) {
          console.error(`Failed to save dirty form [${form.id}]:`, err)
          allSuccessful = false
        }
      }
    }
    return allSuccessful
  }, [setFormDirty])

  // Discard all active dirty forms
  const discardAllDirtyForms = useCallback(() => {
    const activeDirty = Array.from(dirtyFormsRef.current.values()).filter(f => f.isDirty)
    activeDirty.forEach(form => {
      if (form.discard) {
        try { form.discard() } catch (err) { console.error(err) }
      }
      setFormDirty(form.id, false)
    })
  }, [setFormDirty])

  // Centralized Navigation Guard
  const confirmNavigation = useCallback((onProceed, options = {}) => {
    const currentDirty = Array.from(dirtyFormsRef.current.values()).filter(f => f.isDirty)
    
    // If no dirty forms exist, proceed immediately
    if (currentDirty.length === 0) {
      if (onProceed) onProceed()
      return Promise.resolve(true)
    }

    // Otherwise, trigger the 3-action confirmation dialog
    return new Promise((resolve) => {
      resolverRef.current = (result) => {
        setDialogConfig(null)
        if (result.action === 'save' && result.success) {
          if (onProceed) onProceed()
          resolve(true)
        } else if (result.action === 'discard') {
          discardAllDirtyForms()
          if (onProceed) onProceed()
          resolve(true)
        } else {
          // Keep Editing
          resolve(false)
        }
      }

      setDialogConfig({
        title: options.title || (currentDirty.length > 1 ? `${currentDirty.length} Forms Unsaved` : `Unsaved Changes`),
        targetFormName: currentDirty.length === 1 ? currentDirty[0].title : null,
        dirtyForms: currentDirty,
        message: options.message || (
          currentDirty.length === 1
            ? `"${currentDirty[0].title}" has unsaved changes. Leaving now will discard your edits.`
            : `You have ${currentDirty.length} forms with unsaved changes. Leaving now will discard your edits.`
        )
      })
    })
  }, [discardAllDirtyForms])

  const handleDialogAction = useCallback(async (action) => {
    if (action === 'save') {
      const success = await saveAllDirtyForms()
      resolverRef.current?.({ action: 'save', success })
    } else if (action === 'discard') {
      resolverRef.current?.({ action: 'discard', success: true })
    } else {
      resolverRef.current?.({ action: 'cancel', success: false })
    }
  }, [saveAllDirtyForms])

  return (
    <DirtyStateContext.Provider
      value={{
        dirtyFormsMap,
        dirtyFormsList,
        dirtyCount,
        isDirty: dirtyCount > 0,
        registerForm,
        unregisterForm,
        setFormDirty,
        confirmNavigation,
        saveAllDirtyForms,
        discardAllDirtyForms,
        dialogConfig,
        handleDialogAction,
      }}
    >
      {children}
    </DirtyStateContext.Provider>
  )
}

export function useDirtyStateContext() {
  const ctx = useContext(DirtyStateContext)
  if (!ctx) {
    throw new Error('useDirtyStateContext must be used within a DirtyStateProvider')
  }
  return ctx
}
