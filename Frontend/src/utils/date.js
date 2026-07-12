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
    return d.toISOString().split('T')[0];
  }
  return '';
};

export const fromInputDate = (str) => {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      return `${d}-${m}-${y}`;
    }
  }
  return str;
};
