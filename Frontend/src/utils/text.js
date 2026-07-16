export function toTitleCase(str) {
  if (str === null || str === undefined || str === '') return '—'
  if (typeof str !== 'string') return String(str)
  
  // Skip date format (DD-MM-YYYY), reference numbers (e.g. TXN-001, PAY-2026-001), or pure numbers
  if (
    /^\d{2}-\d{2}-\d{4}$/.test(str) || 
    /^[A-Z0-9]+-[A-Z0-9-]+$/i.test(str) || 
    /^\d+$/.test(str)
  ) {
    return str
  }

  // Split by camelCase, underscores, and hyphens to split words
  const words = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)

  return words
    .map(word => {
      if (!word) return ''
      // Preserve uppercase acronyms (NEFT, RTGS, GST, GSTIN, IFSC, SBI, HDFC, etc.) if they are all caps
      if (word === word.toUpperCase() && word.length > 1 && !/\d/.test(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}
