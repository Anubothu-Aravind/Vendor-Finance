import { useState, useCallback } from 'react'
import { getFormDiff } from '../utils/formDiff'

export function useSaveConfirmation() {
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const requestSaveConfirmation = useCallback(({
    title = 'Confirm Changes',
    message = 'You are about to save the following changes.',
    initialValues = {},
    currentValues = {},
    labelMap = {},
    onSaveApi,
  }) => {
    const diffs = getFormDiff(initialValues, currentValues, labelMap)

    setConfirmConfig({
      isOpen: true,
      title,
      message,
      changesSummary: diffs,
      onConfirm: async () => {
        setIsSaving(true)
        try {
          const res = await onSaveApi()
          if (res !== false) {
            setConfirmConfig(null)
          }
        } catch (err) {
          console.error('[SaveConfirmation] Error executing onSaveApi:', err)
        } finally {
          setIsSaving(false)
        }
      },
      onCancel: () => setConfirmConfig(null),
      onContinueEditing: () => setConfirmConfig(null),
    })
  }, [])

  const closeSaveConfirmation = useCallback(() => {
    setConfirmConfig(null)
  }, [])

  return {
    confirmConfig,
    isSaving,
    requestSaveConfirmation,
    closeSaveConfirmation,
  }
}
