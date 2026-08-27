export const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { id: 'vendors', label: 'Vendors', group: 'Vendors' },
  { id: 'purchase_bills', label: 'Purchase Bills', group: 'Vendors' },
  { id: 'finance', label: 'Finance', group: 'Finance' },
  { id: 'loans', label: 'Loans', group: 'Finance' },
  { id: 'financial_repayments', label: 'Financial Repayments', group: 'Finance' },
  { id: 'vendor_payments', label: 'Vendor Payments', group: 'Payments' },
  { id: 'cheques', label: 'Cheques', group: 'Payments' },
  { id: 'outstanding', label: 'Outstanding', group: 'Reporting' },
  { id: 'ledger', label: 'Ledger', group: 'Reporting' },
  { id: 'transactions', label: 'Transactions', group: 'Reporting' },
  { id: 'reports', label: 'Reports', group: 'Reporting' },
  { id: 'settings', label: 'Settings', group: 'System' },
]

export const ALL_PERMISSIONS = AVAILABLE_PERMISSIONS.map(p => p.id)

export function hasPermission(user, permission) {
  if (!user) return false
  if (user.role === 'Admin') return true
  if (!permission) return true

  const perms = user.permissions
  if (!perms) return false

  if (Array.isArray(perms)) {
    if (perms.includes(permission)) return true
    if (permission === 'purchase_bills' && perms.includes('bills')) return true
    if (permission === 'vendor_payments' && perms.includes('payments')) return true
    if (permission === 'financial_repayments' && (perms.includes('financier-payments') || perms.includes('finance'))) return true
    if (permission === 'transactions' && (perms.includes('transaction-history') || perms.includes('ledger'))) return true
    if (permission === 'outstanding' && (perms.includes('ledger') || perms.includes('reports'))) return true
    return false
  }

  if (typeof perms === 'object') {
    if (perms[permission]) return true
    if (permission === 'purchase_bills' && perms.bills) return true
    if (permission === 'vendor_payments' && perms.payments) return true
    if (permission === 'financial_repayments' && (perms.finance || perms['financier-payments'])) return true
    if (permission === 'transactions' && (perms.ledger || perms['transaction-history'])) return true
    if (permission === 'outstanding' && (perms.ledger || perms.reports)) return true
    return false
  }

  return false
}

