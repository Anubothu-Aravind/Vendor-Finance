/**
 * Comprehensive Multi-Module Excel Parser for Vastrams Financial Application.
 * Supports: Vendors, Purchase Bills, Financiers (Finance), Loans, Vendor Payments, Fin. Repayments, Cheques.
 */

export function normalizeString(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function normalizeText(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim().replace(/\s+/g, ' ')
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined' || str === 'N/A') return ''
  return str
}

export function normalizeNumber(val, options = { required: false, min: 0 }) {
  if (val === null || val === undefined || val === '') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required numeric value is missing' }
    }
    return { valid: true, value: options.defaultVal !== undefined ? options.defaultVal : null }
  }
  
  if (typeof val === 'number') {
    if (isNaN(val)) {
      return { valid: false, value: null, error: 'Invalid numeric value' }
    }
    if (options.min !== undefined && val < options.min) {
      return { valid: false, value: null, error: `Value must be at least ${options.min}` }
    }
    return { valid: true, value: val }
  }

  const str = String(val).trim()
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined' || str === 'N/A') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required numeric value is missing' }
    }
    return { valid: true, value: options.defaultVal !== undefined ? options.defaultVal : null }
  }

  let cleanStr = str.replace(/[₹$€£]/g, '')
    .replace(/\b(rs\.?|inr)\b/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim()

  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    cleanStr = '-' + cleanStr.slice(1, -1)
  }

  const num = Number(cleanStr)
  if (isNaN(num)) {
    return { valid: false, value: null, error: `Invalid numeric value "${str}"` }
  }

  if (options.min !== undefined && num < options.min) {
    return { valid: false, value: null, error: `Value must be at least ${options.min}` }
  }

  return { valid: true, value: num }
}

export function normalizePercentage(val, options = { required: false }) {
  if (val === null || val === undefined || val === '') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required percentage value is missing' }
    }
    return { valid: true, value: null }
  }
  if (typeof val === 'number') {
    return { valid: true, value: val }
  }
  const str = String(val).trim()
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined' || str === 'N/A') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required percentage value is missing' }
    }
    return { valid: true, value: null }
  }

  const clean = str.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
  const num = Number(clean)
  if (isNaN(num)) {
    return { valid: false, value: null, error: `Invalid percentage value "${str}"` }
  }
  return { valid: true, value: num }
}

export function normalizeDate(val, options = { required: false }) {
  if (val === null || val === undefined || val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'N/A') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required date is missing' }
    }
    return { valid: true, value: null }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return { valid: true, value: `${y}-${m}-${d}` }
  }

  if (typeof val === 'number' && val > 10000 && val < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const dateObj = new Date(excelEpoch.getTime() + val * 86400000)
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getUTCFullYear()
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getUTCDate()).padStart(2, '0')
      return { valid: true, value: `${y}-${m}-${d}` }
    }
  }

  const str = String(val).trim()
  if (!str || str === '—' || str === '-' || str === 'null' || str === 'undefined' || str === 'N/A') {
    if (options.required) {
      return { valid: false, value: null, error: 'Required date is missing' }
    }
    return { valid: true, value: null }
  }

  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/.]/)
    const y = parts[0]
    const m = String(parts[1]).padStart(2, '0')
    const d = String(parts[2].split('T')[0]).padStart(2, '0')
    return { valid: true, value: `${y}-${m}-${d}` }
  }

  const dmy = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const year = dmy[3]
    return { valid: true, value: `${year}-${month}-${day}` }
  }

  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return { valid: true, value: `${y}-${m}-${d}` }
  }

  return { valid: false, value: null, error: `Invalid date format "${str}"` }
}

export function parseExcelDate(val) {
  const res = normalizeDate(val, { required: false })
  return res.valid ? res.value : null
}

export function normalizePhone(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined') return ''
  return str.replace(/[^\d+]/g, '')
}

export function normalizeGSTIN(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim().toUpperCase().replace(/\s+/g, '')
}

export function normalizeIFSC(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim().toUpperCase().replace(/\s+/g, '')
}

export function normalizeAccountNumber(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined') return ''
  return str
}

export function normalizeChequeNumber(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (str === '—' || str === '-' || str === 'null' || str === 'undefined') return ''
  const digits = str.replace(/\D/g, '')
  if (digits.length > 0) {
    return digits.padStart(6, '0').slice(-6)
  }
  return str
}

export function findMatchingSheet(sheetNames, exactCandidates, keywordFallbacks) {
  for (const name of sheetNames) {
    const norm = normalizeString(name)
    for (const cand of exactCandidates) {
      if (norm === normalizeString(cand)) return name
    }
  }
  for (const name of sheetNames) {
    const norm = normalizeString(name)
    for (const kw of keywordFallbacks) {
      if (norm.includes(normalizeString(kw))) return name
    }
  }
  return null
}

function getRowValue(normMap, aliases) {
  for (const a of aliases) {
    const k = normalizeString(a)
    if (normMap[k] !== undefined && normMap[k] !== null && normMap[k] !== '' && normMap[k] !== '—') {
      return normMap[k]
    }
  }
  return undefined
}

/**
 * MODULE 1: VENDORS
 */
function parseVendorRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const nameRaw = getRowValue(normMap, [
    'Vendor Name', 'Vendor', 'Name', 'Supplier Name', 'Supplier', 'Party Name',
    'Company Name', 'Firm Name', 'Party', 'vendorName', 'vendor_name', 'name'
  ])
  const name = normalizeText(nameRaw)
  if (!name) {
    invalidRows.push({ sheet: 'Vendors', row: rowIndex + 2, field: 'Vendor Name', value: nameRaw, reason: 'Missing required Vendor Name' })
    return null
  }

  const contactPerson = normalizeText(getRowValue(normMap, ['Contact Person', 'Contact', 'Person', 'Owner', 'Representative', 'contactPerson', 'contact_person']))
  const phone = normalizePhone(getRowValue(normMap, ['Phone', 'Mobile', 'Contact Number', 'Phone Number', 'Mobile Number', 'Tel', 'phone', 'mobile']))
  const email = normalizeText(getRowValue(normMap, ['Email', 'Email Address', 'Mail', 'Email ID', 'email', 'emailAddress']))
  const address = normalizeText(getRowValue(normMap, ['Address', 'Location', 'City', 'Office Address', 'address']))
  
  const typeRaw = normalizeText(getRowValue(normMap, ['Vendor Type', 'Type', 'Category', 'type', 'vendorType']))
  let type = 'largeVendor'
  if (typeRaw && (typeRaw.toLowerCase().includes('small') || typeRaw.toLowerCase() === 'smallvendor')) {
    type = 'smallVendor'
  }

  const gstin = normalizeGSTIN(getRowValue(normMap, ['GSTIN', 'GST', 'GST Number', 'GST No', 'Tax ID', 'gstin', 'gst_number']))
  
  // Safe status extraction
  let statusRaw = normalizeText(getRowValue(normMap, [
    'Status', 'Account Status', 'Vendor Status', 'State', 'status', 'accountStatus', 'vendorStatus', 'Active / Inactive', 'Active/Inactive'
  ]))

  // Safe opening balance extraction
  const rawOpeningVal = getRowValue(normMap, [
    'Opening Balance', 'Opening Bal', 'Opening', 'Initial Balance', 'openingBalance', 'opening_balance', 'openingBal'
  ])

  let openingBalance = 0
  if (rawOpeningVal !== undefined && rawOpeningVal !== null && rawOpeningVal !== '') {
    const rawOpeningStr = String(rawOpeningVal).trim().toLowerCase()
    // If the value in opening balance is actually a status string like "active" or "inactive"
    if (rawOpeningStr === 'active' || rawOpeningStr === 'inactive') {
      if (!statusRaw) {
        statusRaw = rawOpeningVal
      }
      openingBalance = 0
    } else {
      const openingBalRes = normalizeNumber(rawOpeningVal, { required: false, defaultVal: 0 })
      if (!openingBalRes.valid) {
        invalidRows.push({ sheet: 'Vendors', row: rowIndex + 2, field: 'Opening Balance', value: rawOpeningVal, reason: openingBalRes.error })
        return null
      }
      openingBalance = openingBalRes.value
    }
  }

  const status = statusRaw && statusRaw.toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
  const bankName = normalizeText(getRowValue(normMap, ['Bank Name', 'Bank', 'Banker', 'bankName', 'bank_name']))
  const accountNo = normalizeAccountNumber(getRowValue(normMap, ['Account Number', 'Account No', 'Bank Account Number', 'A/C No', 'Acc No', 'accountNo', 'account_number', 'accountNumber']))
  const ifsc = normalizeIFSC(getRowValue(normMap, ['IFSC', 'IFSC Code', 'Bank IFSC', 'ifsc', 'ifscCode']))

  return {
    name,
    contactPerson,
    phone,
    email,
    address,
    type,
    gstin,
    openingBalance,
    status,
    bankName,
    accountNo,
    ifsc
  }
}

/**
 * MODULE 2: PURCHASE BILLS
 */
function parseBillRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const billNumberRaw = getRowValue(normMap, [
    'Bill Number', 'Bill No', 'Invoice Number', 'Invoice No', 'Bill ID', 'Invoice ID',
    'Ref', 'Reference', 'PB Number', 'Bill #', 'Invoice #', 'billNumber', 'bill_number', 'invoiceNumber', 'invoice_number'
  ])
  const billNumber = normalizeText(billNumberRaw)
  if (!billNumber) {
    invalidRows.push({ sheet: 'Purchase Bills', row: rowIndex + 2, field: 'Bill Number', value: billNumberRaw, reason: 'Missing required Bill Number' })
    return null
  }

  const vendorRaw = getRowValue(normMap, [
    'Vendor Name', 'Vendor', 'Supplier Name', 'Supplier', 'Party Name', 'Party',
    'Company Name', 'vendorName', 'vendor_name', 'vendorId'
  ])
  const vendorName = normalizeText(vendorRaw) || 'Primary Vendor'

  const amountRes = normalizeNumber(getRowValue(normMap, [
    'Bill Amount', 'Amount', 'Total Amount', 'Invoice Amount', 'Grand Total', 'Total',
    'Net Amount', 'Amount (₹)', 'amount', 'billAmount', 'totalAmount'
  ]), { required: true, min: 0 })
  if (!amountRes.valid) {
    invalidRows.push({ sheet: 'Purchase Bills', row: rowIndex + 2, field: 'Amount', value: getRowValue(normMap, ['Amount', 'Bill Amount']), reason: amountRes.error })
    return null
  }

  const billDateRes = normalizeDate(getRowValue(normMap, ['Bill Date', 'Invoice Date', 'Date', 'Issue Date', 'billDate', 'bill_date', 'invoiceDate']), { required: false })
  if (!billDateRes.valid) {
    invalidRows.push({ sheet: 'Purchase Bills', row: rowIndex + 2, field: 'Bill Date', value: getRowValue(normMap, ['Bill Date', 'Invoice Date']), reason: billDateRes.error })
    return null
  }
  const billDate = billDateRes.value || new Date().toISOString().split('T')[0]

  const dueDateRes = normalizeDate(getRowValue(normMap, ['Due Date', 'Expiry Date', 'Payment Due Date', 'dueDate', 'due_date']), { required: false })
  if (!dueDateRes.valid) {
    invalidRows.push({ sheet: 'Purchase Bills', row: rowIndex + 2, field: 'Due Date', value: getRowValue(normMap, ['Due Date']), reason: dueDateRes.error })
    return null
  }
  const dueDate = dueDateRes.value || billDate

  const statusRaw = normalizeText(getRowValue(normMap, ['Status', 'Bill Status', 'Payment Status', 'status', 'billStatus']))
  let status = 'UNPAID'
  if (statusRaw) {
    const s = statusRaw.toUpperCase()
    if (s.includes('PARTIAL')) status = 'PARTIALLY_PAID'
    else if (s === 'PAID' || s === 'SETTLED') status = 'PAID'
    else status = 'UNPAID'
  }

  const paymentTypeRaw = normalizeText(getRowValue(normMap, ['Payment Type', 'Type', 'Payment Term', 'Terms', 'paymentType', 'payment_type']))
  const paymentType = (paymentTypeRaw && paymentTypeRaw.toLowerCase().includes('cash')) ? 'Cash' : 'Credit'

  const remarks = normalizeText(getRowValue(normMap, ['Remarks', 'Notes', 'Description', 'Comments', 'Items', 'Particulars', 'remarks', 'notes']))

  return {
    billNumber,
    vendorName,
    vendorId: vendorName,
    paymentType,
    amount: amountRes.value,
    paidAmount: 0,
    outstandingAmount: amountRes.value,
    billDate,
    dueDate,
    status,
    remarks
  }
}

/**
 * MODULE 3: FINANCE (FINANCIERS)
 */
function parseFinancierRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  // Support all explicit aliases for Financier Name
  const nameRaw = getRowValue(normMap, [
    'Financier Name', 'Financier', 'Name', 'Finance Provider', 'Provider Name', 'Provider',
    'Finance', 'Lender Name', 'Lender', 'Investor Name', 'Investor', 'Party Name', 'Party',
    'Borrower Name', 'Borrower', 'Institution Name', 'Institution', 'Firm Name', 'Company Name',
    'Company', 'Account Name', 'financierName', 'financier_name', 'financeProvider', 'providerName',
    'financier', 'lender', 'investor', 'name'
  ])
  
  let name = normalizeText(nameRaw)
  
  // If Financier Name is not explicitly found under name aliases, check if any identifiable party/contact exists
  const contactPerson = normalizeText(getRowValue(normMap, ['Contact Person', 'Contact', 'Owner', 'Person', 'Representative', 'contactPerson', 'contact_person']))
  const phone = normalizePhone(getRowValue(normMap, ['Phone', 'Mobile', 'Contact Number', 'Phone Number', 'Mobile Number', 'Tel', 'phone', 'mobile']))
  const email = normalizeText(getRowValue(normMap, ['Email', 'Email Address', 'Mail', 'Email ID', 'email', 'emailAddress']))

  if (!name) {
    if (contactPerson) {
      name = contactPerson
    } else if (phone) {
      name = `Financier (${phone})`
    }
  }

  if (!name) {
    invalidRows.push({ sheet: 'Finance', row: rowIndex + 2, field: 'Financier Name', value: nameRaw, reason: 'Missing required Financier Name' })
    return null
  }

  const address = normalizeText(getRowValue(normMap, ['Address', 'Location', 'City', 'Office Address', 'address']))
  const notes = normalizeText(getRowValue(normMap, ['Notes', 'Remarks', 'Description', 'Comments', 'notes', 'remarks']))

  const rateRes = normalizePercentage(getRowValue(normMap, [
    'Default Interest Rate', 'Interest Rate', 'Rate', 'ROI', 'Annual Rate', 'Interest %', 'Interest',
    'defaultInterestRate', 'interestRate', 'interest_rate'
  ]), { required: false })
  if (!rateRes.valid) {
    invalidRows.push({ sheet: 'Finance', row: rowIndex + 2, field: 'Default Interest Rate', value: getRowValue(normMap, ['Default Interest Rate', 'Interest Rate']), reason: rateRes.error })
    return null
  }

  const statusRaw = normalizeText(getRowValue(normMap, ['Status', 'Account Status', 'Financier Status', 'State', 'status', 'accountStatus']))
  const status = statusRaw && statusRaw.toLowerCase() === 'inactive' ? 'Inactive' : 'Active'

  return {
    name,
    contactPerson,
    phone,
    email,
    address,
    notes,
    defaultInterestRate: rateRes.value !== null ? rateRes.value : 12,
    outstandingBalance: 0,
    status
  }
}

/**
 * MODULE 4: LOANS
 */
function parseLoanRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const loanReferenceRaw = getRowValue(normMap, [
    'Loan Number', 'Loan Reference', 'Loan No', 'Loan Ref', 'Loan #', 'Note Number', 'Note No',
    'Note #', 'noteNumber', 'loanReference', 'loan_reference', 'loan_number', 'Ref', 'Reference', 'Loan ID'
  ])
  const loanReference = normalizeText(loanReferenceRaw)
  if (!loanReference) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, field: 'Loan Number', value: loanReferenceRaw, reason: 'Missing required Loan Number / Reference' })
    return null
  }

  const borrowerName = normalizeText(getRowValue(normMap, [
    'Borrower Name', 'Borrower', 'Financier Name', 'Financier', 'Finance Provider', 'Provider',
    'Party Name', 'Party', 'Lender Name', 'Lender', 'Investor Name', 'Investor', 'financierName', 'financierId'
  ])) || 'Primary Financier'

  const phone = normalizePhone(getRowValue(normMap, ['Phone', 'Mobile', 'Contact', 'Phone Number', 'Mobile Number', 'Tel', 'phone', 'mobile']))

  const principalRes = normalizeNumber(getRowValue(normMap, [
    'Principal Amount', 'Principal', 'Loan Amount', 'Amount', 'Amount (₹)', 'principalAmount', 'principal_amount', 'loanAmount'
  ]), { required: true, min: 0 })
  if (!principalRes.valid) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, field: 'Principal Amount', value: getRowValue(normMap, ['Principal Amount', 'Loan Amount']), reason: principalRes.error })
    return null
  }

  // Interest Rate is OPTIONAL
  const interestRes = normalizePercentage(getRowValue(normMap, [
    'Interest Rate', 'Interest', 'Rate', 'ROI', 'Interest %', 'Annual Rate', 'interestRate', 'interest_rate', 'Rate (%)'
  ]), { required: false })
  if (!interestRes.valid) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, field: 'Interest Rate', value: getRowValue(normMap, ['Interest Rate']), reason: interestRes.error })
    return null
  }

  // Loan Date is OPTIONAL
  const loanDateRes = normalizeDate(getRowValue(normMap, [
    'Loan Date', 'Drawdown Date', 'Date', 'Issue Date', 'Start Date', 'Disbursement Date', 'drawdownDate', 'drawdown_date', 'loanDate', 'loan_date'
  ]), { required: false })
  if (!loanDateRes.valid) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, field: 'Loan Date', value: getRowValue(normMap, ['Loan Date', 'Drawdown Date']), reason: loanDateRes.error })
    return null
  }

  // Maturity Date is OPTIONAL
  const maturityDateRes = normalizeDate(getRowValue(normMap, [
    'Maturity Date', 'Due Date', 'Expiry Date', 'End Date', 'maturityDate', 'maturity_date', 'dueDate'
  ]), { required: false })
  if (!maturityDateRes.valid) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, field: 'Maturity Date', value: getRowValue(normMap, ['Maturity Date', 'Due Date']), reason: maturityDateRes.error })
    return null
  }

  const statusRaw = normalizeText(getRowValue(normMap, ['Status', 'Loan Status', 'status', 'loanStatus', 'State']))
  let status = 'ACTIVE'
  if (statusRaw) {
    const s = statusRaw.toUpperCase()
    if (s === 'CLOSED' || s === 'SETTLED' || s === 'PAID') status = 'SETTLED'
    else if (s === 'OVERDUE') status = 'OVERDUE'
    else status = 'ACTIVE'
  }

  const notes = normalizeText(getRowValue(normMap, ['Remarks', 'Notes', 'Description', 'Comments', 'notes', 'remarks']))

  return {
    loanReference,
    financierName: borrowerName,
    financierId: borrowerName,
    phone,
    principalAmount: principalRes.value,
    interestRate: interestRes.value,
    drawdownDate: loanDateRes.value,
    maturityDate: maturityDateRes.value,
    status,
    notes,
    outstandingPrincipal: principalRes.value,
    paidPrincipal: 0,
    paidInterest: 0,
    accruedInterest: 0
  }
}

/**
 * MODULE 5: VENDOR PAYMENTS
 */
function parsePaymentRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const refRaw = getRowValue(normMap, [
    'Reference Number', 'Reference No', 'Ref No', 'Ref #', 'Payment Ref', 'Transaction ID',
    'Txn ID', 'UTR', 'Ref', 'Payment Number', 'Payment No', 'Receipt No', 'referenceNumber', 'refNumber'
  ])
  const referenceNumber = normalizeText(refRaw) || `PAY-${rowIndex + 1}`

  const vendorRaw = getRowValue(normMap, [
    'Vendor Name', 'Vendor', 'Supplier Name', 'Supplier', 'Party Name', 'Party', 'vendorName', 'vendorId'
  ])
  const vendorName = normalizeText(vendorRaw) || 'Primary Vendor'

  const amountRes = normalizeNumber(getRowValue(normMap, [
    'Amount', 'Payment Amount', 'Paid Amount', 'Total Paid', 'Amount Paid', 'Amount (₹)', 'amount', 'paymentAmount'
  ]), { required: true, min: 0 })
  if (!amountRes.valid) {
    invalidRows.push({ sheet: 'Vendor Payments', row: rowIndex + 2, field: 'Amount', value: getRowValue(normMap, ['Amount', 'Payment Amount']), reason: amountRes.error })
    return null
  }

  const dateRes = normalizeDate(getRowValue(normMap, ['Payment Date', 'Date', 'Paid Date', 'Txn Date', 'paymentDate', 'payment_date']), { required: false })
  if (!dateRes.valid) {
    invalidRows.push({ sheet: 'Vendor Payments', row: rowIndex + 2, field: 'Payment Date', value: getRowValue(normMap, ['Payment Date', 'Date']), reason: dateRes.error })
    return null
  }
  const paymentDate = dateRes.value || new Date().toISOString().split('T')[0]

  const modeRaw = normalizeText(getRowValue(normMap, ['Payment Mode', 'Mode', 'Method', 'Payment Type', 'Type', 'paymentMode', 'payment_mode']))
  let paymentMode = 'BANK_TRANSFER'
  if (modeRaw) {
    const m = modeRaw.toUpperCase()
    if (m.includes('CHEQUE') || m.includes('CHECK')) paymentMode = 'CHEQUE'
    else if (m.includes('CASH')) paymentMode = 'CASH'
    else if (m.includes('OTHER')) paymentMode = 'OTHER'
    else paymentMode = 'BANK_TRANSFER'
  }

  const chequeNumber = normalizeChequeNumber(getRowValue(normMap, ['Cheque Number', 'Cheque No', 'Check Number', 'Check No', 'Cheque #', 'Check #', 'chequeNumber']))
  const bankName = normalizeText(getRowValue(normMap, ['Bank Name', 'Bank', 'Bank Account', 'bankName', 'bank_name']))
  const description = normalizeText(getRowValue(normMap, ['Description', 'Remarks', 'Notes', 'Comments', 'description', 'remarks', 'notes']))

  return {
    referenceNumber,
    vendorName,
    vendorId: vendorName,
    amount: amountRes.value,
    paymentDate,
    paymentMode,
    chequeNumber,
    bankName,
    description,
    allocations: []
  }
}

/**
 * MODULE 6: FIN. REPAYMENTS
 */
function parseRepaymentRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const refRaw = getRowValue(normMap, [
    'Reference Number', 'Reference No', 'Ref No', 'Ref #', 'Repayment Ref', 'Transaction ID',
    'Txn ID', 'UTR', 'Ref', 'Repayment No', 'Repayment Number', 'referenceNumber', 'repaymentNumber'
  ])
  const referenceNumber = normalizeText(refRaw) || `REP-${rowIndex + 1}`

  const loanRefRaw = getRowValue(normMap, [
    'Loan Number', 'Loan Reference', 'Loan No', 'Loan Ref', 'Loan #', 'Note Number', 'Note No',
    'Loan', 'loanReference', 'loanNumber', 'loanId'
  ])
  const loanReference = normalizeText(loanRefRaw) || 'LN001'

  const finRaw = getRowValue(normMap, [
    'Financier Name', 'Financier', 'Finance Provider', 'Provider', 'Lender Name', 'Lender',
    'Party Name', 'Party', 'Borrower Name', 'financierName'
  ])
  const financierName = normalizeText(finRaw) || 'Primary Financier'

  const amountRes = normalizeNumber(getRowValue(normMap, [
    'Amount', 'Repayment Amount', 'Paid Amount', 'Total Repayment', 'Amount (₹)', 'amount', 'repaymentAmount'
  ]), { required: true, min: 0 })
  if (!amountRes.valid) {
    invalidRows.push({ sheet: 'Fin. Repayments', row: rowIndex + 2, field: 'Amount', value: getRowValue(normMap, ['Amount', 'Repayment Amount']), reason: amountRes.error })
    return null
  }

  const principalRes = normalizeNumber(getRowValue(normMap, ['Principal Paid', 'Principal Amount', 'Principal Component', 'Principal', 'principalPaid', 'principal_paid']), { required: false, defaultVal: amountRes.value })
  const interestRes = normalizeNumber(getRowValue(normMap, ['Interest Paid', 'Interest Amount', 'Interest Component', 'Interest', 'interestPaid', 'interest_paid']), { required: false, defaultVal: 0 })

  const dateRes = normalizeDate(getRowValue(normMap, ['Repayment Date', 'Date', 'Paid Date', 'repaymentDate', 'repayment_date']), { required: false })
  if (!dateRes.valid) {
    invalidRows.push({ sheet: 'Fin. Repayments', row: rowIndex + 2, field: 'Repayment Date', value: getRowValue(normMap, ['Repayment Date', 'Date']), reason: dateRes.error })
    return null
  }
  const repaymentDate = dateRes.value || new Date().toISOString().split('T')[0]

  const modeRaw = normalizeText(getRowValue(normMap, ['Repayment Mode', 'Payment Mode', 'Mode', 'Method', 'repaymentMode', 'repayment_mode']))
  let repaymentMode = 'BANK_TRANSFER'
  if (modeRaw) {
    const m = modeRaw.toUpperCase()
    if (m.includes('CHEQUE') || m.includes('CHECK')) repaymentMode = 'CHEQUE'
    else if (m.includes('CASH')) repaymentMode = 'CASH'
    else if (m.includes('OTHER')) repaymentMode = 'OTHER'
    else repaymentMode = 'BANK_TRANSFER'
  }

  const chequeNumber = normalizeChequeNumber(getRowValue(normMap, ['Cheque Number', 'Cheque No', 'Check Number', 'Check No', 'Cheque #', 'Check #', 'chequeNumber']))
  const description = normalizeText(getRowValue(normMap, ['Description', 'Remarks', 'Notes', 'Comments', 'description', 'remarks']))

  return {
    referenceNumber,
    loanReference,
    loanId: loanReference,
    financierName,
    amount: amountRes.value,
    principalPaid: principalRes.value,
    interestPaid: interestRes.value,
    repaymentDate,
    repaymentMode,
    chequeNumber,
    description
  }
}

/**
 * MODULE 7: CHEQUES
 */
function parseChequeRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const chequeNumberRaw = getRowValue(normMap, [
    'Cheque Number', 'Cheque No', 'Check Number', 'Check No', 'Cheque #', 'Check #',
    'chequeNumber', 'cheque_number', 'Cheque', 'Check'
  ])
  const chequeNumber = normalizeChequeNumber(chequeNumberRaw)
  if (!chequeNumber) {
    invalidRows.push({ sheet: 'Cheques', row: rowIndex + 2, field: 'Cheque Number', value: chequeNumberRaw, reason: 'Missing or invalid Cheque Number' })
    return null
  }

  const partyName = normalizeText(getRowValue(normMap, [
    'Party Name', 'Party', 'Payee Name', 'Payee', 'Vendor Name', 'Financier Name',
    'Finance Provider', 'Provider', 'Vendor', 'Financier', 'Beneficiary', 'Name', 'partyName', 'party_name', 'payee'
  ])) || 'Party'

  const amountRes = normalizeNumber(getRowValue(normMap, [
    'Amount', 'Cheque Amount', 'Total Amount', 'Amount (₹)', 'amount', 'chequeAmount'
  ]), { required: true, min: 0 })
  if (!amountRes.valid) {
    invalidRows.push({ sheet: 'Cheques', row: rowIndex + 2, field: 'Amount', value: getRowValue(normMap, ['Amount', 'Cheque Amount']), reason: amountRes.error })
    return null
  }

  const dateRes = normalizeDate(getRowValue(normMap, ['Cheque Date', 'Date', 'Issue Date', 'Date of Issue', 'chequeDate', 'cheque_date']), { required: false })
  if (!dateRes.valid) {
    invalidRows.push({ sheet: 'Cheques', row: rowIndex + 2, field: 'Cheque Date', value: getRowValue(normMap, ['Cheque Date', 'Date']), reason: dateRes.error })
    return null
  }
  const chequeDate = dateRes.value || new Date().toISOString().split('T')[0]

  const bankName = normalizeText(getRowValue(normMap, ['Bank Name', 'Bank', 'Drawee Bank', 'Bank Name & Branch', 'bankName', 'bank_name']))
  
  const statusRaw = normalizeText(getRowValue(normMap, ['Status', 'Cheque Status', 'State', 'status', 'chequeStatus']))
  let status = 'PENDING'
  if (statusRaw) {
    const s = statusRaw.toUpperCase()
    if (s.includes('CLEAR') || s === 'PAID') status = 'CLEARED'
    else if (s.includes('BOUNCE') || s.includes('DISHONOR')) status = 'BOUNCED'
    else if (s.includes('CANCEL')) status = 'CANCELLED'
    else status = 'PENDING'
  }

  const typeRaw = normalizeText(getRowValue(normMap, ['Type', 'Cheque Type', 'Transaction Type', 'Direction', 'type', 'chequeType']))
  let type = 'ISSUED_VENDOR'
  if (typeRaw) {
    const t = typeRaw.toUpperCase()
    if (t.includes('REC') || t.includes('INCOMING')) type = 'RECEIVED_FINANCIER'
    else if (t.includes('FINANCIER')) type = 'ISSUED_FINANCIER'
    else if (t.includes('VENDOR')) type = 'ISSUED_VENDOR'
    else type = 'OTHER'
  }

  const notes = normalizeText(getRowValue(normMap, ['Remarks', 'Notes', 'Comments', 'Description', 'notes', 'remarks']))

  return {
    chequeNumber,
    partyName,
    type,
    amount: amountRes.value,
    chequeDate,
    bankName,
    status,
    notes
  }
}

/**
 * Main parser entry point for Excel Workbooks.
 */
export function parseExcelBackup(XLSX, workbook) {
  const sheetNames = workbook.SheetNames || []
  const invalidRows = []
  const parsed = {
    settings: {},
    vendors: [],
    financiers: [],
    loans: [],
    bills: [],
    payments: [],
    repayments: [],
    cheques: [],
    transactions: []
  }

  const getSheetRows = (sheetName) => {
    if (!sheetName || !workbook.Sheets[sheetName]) return []
    const sheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  // 1. Identify sheet names
  let loanSheetName = findMatchingSheet(sheetNames, ['Loans', 'Loan', 'Loan Test Data', 'LoanData', 'Loan_Data', 'Loan Records', 'Loan Accounts'], ['loan'])
  let vendorSheetName = findMatchingSheet(sheetNames, ['Vendors', 'Vendor', 'Suppliers', 'Supplier', 'Vendor List', 'Vendor Data'], ['vendor', 'supplier'])
  let billSheetName = findMatchingSheet(sheetNames, ['Bills', 'Bill', 'Purchase Bills', 'PurchaseBills', 'Invoices', 'Invoice', 'Bill Data'], ['bill', 'invoice', 'purchase'])
  let financierSheetName = findMatchingSheet(sheetNames, ['Financiers', 'Financier', 'Finance', 'Finance Providers', 'Lenders', 'Lender', 'Investors', 'Investor'], ['financier', 'finance', 'lender', 'provider'])
  let chequeSheetName = findMatchingSheet(sheetNames, ['Cheques', 'Cheque', 'Checks', 'Check', 'Cheque Registry', 'Check Registry'], ['cheque', 'check'])
  let paymentSheetName = findMatchingSheet(sheetNames, ['Payments', 'Payment', 'Vendor Payments', 'VendorPayments', 'Payment List'], ['payment', 'vendorpayment'])
  let repaymentSheetName = findMatchingSheet(sheetNames, ['Repayments', 'Repayment', 'Loan Repayments', 'LoanRepayments', 'Fin Repayments', 'Financier Payments'], ['repayment', 'loanrepayment'])
  let transactionSheetName = findMatchingSheet(sheetNames, ['Transactions', 'Transaction', 'Ledger', 'Ledger Entries', 'Running Ledger'], ['transaction', 'ledger'])
  let settingsSheetName = findMatchingSheet(sheetNames, ['Settings', 'Setting', 'Config', 'Configuration', 'Profile'], ['setting', 'config'])

  // Avoid payment matching repayment sheet
  if (paymentSheetName && repaymentSheetName && paymentSheetName === repaymentSheetName) {
    paymentSheetName = null
  }

  // 2. Single-sheet fallback heuristic based on headers
  if (sheetNames.length === 1 && !loanSheetName && !vendorSheetName && !billSheetName && !financierSheetName && !chequeSheetName && !paymentSheetName && !repaymentSheetName) {
    const onlySheetName = sheetNames[0]
    const rows = getSheetRows(onlySheetName)
    if (rows.length > 0) {
      const firstRowKeys = Object.keys(rows[0]).map(normalizeString)
      if (firstRowKeys.some(k => k.includes('loan') || k.includes('borrower') || k.includes('principal') || k.includes('notenumber'))) {
        loanSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('gstin') || (k.includes('vendor') && !k.includes('payment')))) {
        vendorSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('billnumber') || (k.includes('bill') && k.includes('amount')))) {
        billSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('cheque') || k.includes('check'))) {
        chequeSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('repayment') || (k.includes('principalpaid') && k.includes('interestpaid')))) {
        repaymentSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('payment') || k.includes('paymentmode'))) {
        paymentSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('financier') || k.includes('lender') || k.includes('financeprovider'))) {
        financierSheetName = onlySheetName
      }
    }
  }

  // Parse Vendors
  if (vendorSheetName) {
    const rows = getSheetRows(vendorSheetName)
    rows.forEach((row, idx) => {
      // Ignore completely empty rows
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseVendorRow(row, idx, invalidRows)
      if (item) parsed.vendors.push(item)
    })
  }

  // Parse Purchase Bills
  if (billSheetName) {
    const rows = getSheetRows(billSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseBillRow(row, idx, invalidRows)
      if (item) parsed.bills.push(item)
    })
  }

  // Parse Financiers (Finance)
  if (financierSheetName) {
    const rows = getSheetRows(financierSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseFinancierRow(row, idx, invalidRows)
      if (item) parsed.financiers.push(item)
    })
  }

  // Parse Loans
  if (loanSheetName) {
    const rows = getSheetRows(loanSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseLoanRow(row, idx, invalidRows)
      if (item) parsed.loans.push(item)
    })
  }

  // Parse Vendor Payments
  if (paymentSheetName) {
    const rows = getSheetRows(paymentSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parsePaymentRow(row, idx, invalidRows)
      if (item) parsed.payments.push(item)
    })
  }

  // Parse Fin. Repayments
  if (repaymentSheetName) {
    const rows = getSheetRows(repaymentSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseRepaymentRow(row, idx, invalidRows)
      if (item) parsed.repayments.push(item)
    })
  }

  // Parse Cheques
  if (chequeSheetName) {
    const rows = getSheetRows(chequeSheetName)
    rows.forEach((row, idx) => {
      if (Object.values(row).every(v => v === '' || v === null || v === undefined)) return
      const item = parseChequeRow(row, idx, invalidRows)
      if (item) parsed.cheques.push(item)
    })
  }

  // Parse Transactions / Settings if available
  if (transactionSheetName) {
    parsed.transactions = getSheetRows(transactionSheetName)
  }
  if (settingsSheetName) {
    const sRows = getSheetRows(settingsSheetName)
    parsed.settings = sRows[0] || {}
  }

  const counts = {
    vendors: parsed.vendors.length,
    bills: parsed.bills.length,
    loans: parsed.loans.length,
    financiers: parsed.financiers.length,
    cheques: parsed.cheques.length,
    payments: parsed.payments.length,
    repayments: parsed.repayments.length,
    transactions: parsed.transactions.length
  }

  const summaryParts = []
  summaryParts.push(`${counts.vendors} vendors`)
  summaryParts.push(`${counts.bills} bills`)
  summaryParts.push(`${counts.loans} loans`)
  if (counts.financiers > 0) summaryParts.push(`${counts.financiers} financiers`)
  if (counts.payments > 0) summaryParts.push(`${counts.payments} payments`)
  if (counts.repayments > 0) summaryParts.push(`${counts.repayments} repayments`)
  if (counts.cheques > 0) summaryParts.push(`${counts.cheques} cheques`)

  return {
    parsed,
    counts,
    invalidRows,
    summaryText: summaryParts.join(' · ')
  }
}
