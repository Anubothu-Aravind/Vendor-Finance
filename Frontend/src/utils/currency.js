/**
 * Formats numbers into Indian Rupee currency style (lakhs separators)
 * e.g., 1524500.5 -> ₹15,24,500.50
 */
export function formatINR(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '₹0.00'
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Formats values into simple numbers with Indian formatting (no currency symbol)
 */
export function formatNumberIN(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}
export default formatINR
