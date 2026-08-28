// Date utilities for converting between HTML5 input date (YYYY-MM-DD) and internal storage format (DD-MM-YYYY)

export const toInputDate = (str) => {
  if (!str) return '';
  // if already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // if dd-mm-yyyy
  const parts = str.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      return `${y}-${m}-${d}`;
    }
  }
  // fallback for formats like "06 Jun 2026"
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`;
  }
  return '';
};

export const fromInputDate = (str) => {
  if (!str) return '';
  // Extract pure YYYY-MM-DD if ISO string with time is passed
  const cleanStr = str.split('T')[0]
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      return `${d}-${m}-${y}`;
    }
  }
  return str;
};

export const getTodayFormatted = () => {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

export const getDefaultMaturityDate = (dateStr) => {
  if (!dateStr) dateStr = getTodayFormatted()
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    // If DD-MM-YYYY
    if (parts[2].length === 4) {
      return `${parts[0]}-${parts[1]}-${parseInt(parts[2], 10) + 1}`
    }
    // If YYYY-MM-DD
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parseInt(parts[0], 10) + 1}`
    }
  }
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    d.setFullYear(d.getFullYear() + 1)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }
  return getTodayFormatted()
}

export const formatDateDisplay = (dateInput) => {
  if (!dateInput) return '—'
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  if (typeof dateInput === 'string') {
    // If it's "YYYY-MM-DD" or "YYYY-MM-DDT..."
    const cleanStr = dateInput.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [y, m, d] = cleanStr.split('-')
      const monthIdx = parseInt(m, 10) - 1
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parseInt(d, 10)} ${monthNames[monthIdx]} ${y}`
      }
    }
    // If it's "DD-MM-YYYY"
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
      const [d, m, y] = dateInput.split('-')
      const monthIdx = parseInt(m, 10) - 1
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parseInt(d, 10)} ${monthNames[monthIdx]} ${y}`
      }
    }
  }

  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
