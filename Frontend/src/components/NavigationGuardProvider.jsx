import React, { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { useDirtyStateContext } from '../context/DirtyStateContext'
import { UnsavedChangesDialog } from './ui/UnsavedChangesDialog'
import { UnsavedChangesIndicator } from './ui/UnsavedChangesIndicator'

export function NavigationGuardProvider({ children }) {
  const { isDirty, confirmNavigation } = useDirtyStateContext()
  const isHandlingBlockerRef = useRef(false)

  // 1. Intercept internal client-side router navigation via React Router useBlocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (blocker.state === 'blocked' && !isHandlingBlockerRef.current) {
      isHandlingBlockerRef.current = true

      confirmNavigation(() => {
        blocker.proceed()
      }).then((proceeded) => {
        if (!proceeded) {
          blocker.reset()
        }
        isHandlingBlockerRef.current = false
      })
    }
  }, [blocker, confirmNavigation])

  // 2. Intercept browser hard refresh (F5 / Ctrl+R) & tab closure via beforeunload
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  return (
    <>
      {children}
      <UnsavedChangesDialog />
    </>
  )
}
