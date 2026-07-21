/**
 * Utility to calculate human-readable diffs between initial form state and updated form state.
 * @param {Object} initialObj Initial form values
 * @param {Object} currentObj Current form values
 * @param {Object} labelMap Optional mapping of field keys to friendly display labels
 * @returns {Array<{ label: string, oldValue: any, newValue: any }>}
 */
export function getFormDiff(initialObj = {}, currentObj = {}, labelMap = {}) {
  const diffs = []
  if (!initialObj || !currentObj) return diffs

  const allKeys = Array.from(new Set([...Object.keys(initialObj), ...Object.keys(currentObj)]))

  for (const key of allKeys) {
    // Ignore internal IDs or confirm fields
    if (key.startsWith('_') || key.startsWith('confirm') || key === 'id') continue

    const oldVal = initialObj[key]
    const newVal = currentObj[key]

    // Skip unedited or null/empty equivalent values
    const normOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim()
    const normNew = newVal === null || newVal === undefined ? '' : String(newVal).trim()

    if (normOld !== normNew) {
      const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      diffs.push({
        label,
        oldValue: normOld || '(Empty)',
        newValue: normNew || '(Empty)'
      })
    }
  }

  return diffs
}
