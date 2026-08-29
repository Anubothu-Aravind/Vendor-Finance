/**
 * Utility for parsing and normalizing Excel backup files and standalone sheets (e.g. Loan Test Data).
 */

export function normalizeString(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseExcelDate(val) {
  if (val === null || val === undefined || val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'N/A') {
    return null
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number' && val > 10000 && val < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const dateObj = new Date(excelEpoch.getTime() + val * 86400000)
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getUTCFullYear()
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  const str = String(val).trim()
  if (!str || str === '—' || str === '-' || str === 'null' || str === 'undefined' || str === 'N/A') {
    return null
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0]
  }
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const year = dmy[3]
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
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

function parseLoanRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const loanReference = getRowValue(normMap, [
    'Loan Number', 'Loan Reference', 'loan_reference', 'loan_number', 'LoanRef', 'LoanNo',
    'Note Number', 'Note No', 'noteNumber', 'loanReference', 'Reference Number', 'Ref', 'Reference', 'Loan ID'
  ])

  const borrowerName = getRowValue(normMap, [
    'Borrower Name', 'Borrower', 'Financier Name', 'Financier', 'financierId',
    'Party Name', 'Party', 'Lender Name', 'Lender', 'Investor'
  ])

  const phone = getRowValue(normMap, ['Phone', 'Mobile', 'Contact', 'Phone Number', 'Mobile Number', 'Tel'])
  const principalRaw = getRowValue(normMap, ['Principal Amount', 'Principal', 'Amount', 'Loan Amount', 'principalAmount', 'Amount (₹)', 'PrincipalAmount'])
  const interestRaw = getRowValue(normMap, ['Interest Rate', 'Interest', 'Rate', 'ROI', 'Interest %', 'interestRate', 'Rate (%)', 'Annual Rate', 'InterestRate'])
  const loanDateRaw = getRowValue(normMap, ['Loan Date', 'Drawdown Date', 'Date', 'Issue Date', 'Start Date', 'drawdownDate', 'loanDate'])
  const maturityDateRaw = getRowValue(normMap, ['Maturity Date', 'Due Date', 'Expiry Date', 'End Date', 'maturityDate', 'dueDate'])
  const statusRaw = getRowValue(normMap, ['Status', 'Loan Status', 'status', 'State'])
  const remarksRaw = getRowValue(normMap, ['Remarks', 'Notes', 'notes', 'remarks', 'Description', 'Comments'])

  // Check required fields
  if (!loanReference || String(loanReference).trim() === '') {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, reason: 'Missing Loan Number / Reference' })
    return null
  }
  const principalAmount = Number(principalRaw)
  if (isNaN(principalAmount) || principalAmount <= 0) {
    invalidRows.push({ sheet: 'Loans', row: rowIndex + 2, reason: `Invalid Principal Amount "${principalRaw}" for Loan ${loanReference}` })
    return null
  }

  let interestRate = null
  if (interestRaw !== undefined && interestRaw !== null && interestRaw !== '' && interestRaw !== '—') {
    const num = Number(interestRaw)
    if (!isNaN(num) && num >= 0) {
      interestRate = num
    }
  }

  const drawdownDate = parseExcelDate(loanDateRaw)
  const maturityDate = parseExcelDate(maturityDateRaw)

  let status = 'ACTIVE'
  if (statusRaw) {
    const s = String(statusRaw).trim().toUpperCase()
    if (s === 'CLOSED' || s === 'SETTLED') status = 'SETTLED'
    else if (s === 'OVERDUE') status = 'OVERDUE'
    else status = 'ACTIVE'
  }

  return {
    loanReference: String(loanReference).trim(),
    financierName: borrowerName ? String(borrowerName).trim() : 'Primary Financier',
    financierId: borrowerName ? String(borrowerName).trim() : 'Primary Financier',
    phone: phone ? String(phone).trim() : '',
    principalAmount: principalAmount,
    interestRate: interestRate,
    drawdownDate: drawdownDate,
    maturityDate: maturityDate,
    status: status,
    notes: remarksRaw ? String(remarksRaw).trim() : '',
    outstandingPrincipal: principalAmount,
    paidPrincipal: 0,
    paidInterest: 0,
    accruedInterest: 0
  }
}

function parseVendorRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const name = getRowValue(normMap, ['Name', 'Vendor Name', 'Vendor', 'Supplier Name', 'Supplier', 'Party Name', 'Company Name'])
  if (!name || String(name).trim() === '') {
    invalidRows.push({ sheet: 'Vendors', row: rowIndex + 2, reason: 'Missing Vendor Name' })
    return null
  }

  const contactPerson = getRowValue(normMap, ['Contact Person', 'Contact', 'Person', 'Owner'])
  const phone = getRowValue(normMap, ['Phone', 'Mobile', 'Contact Number', 'Phone Number'])
  const email = getRowValue(normMap, ['Email', 'Email Address'])
  const address = getRowValue(normMap, ['Address', 'Location'])
  const typeRaw = getRowValue(normMap, ['Type', 'Vendor Type'])
  const gstin = getRowValue(normMap, ['GSTIN', 'GST', 'GST Number'])
  const openingBalanceRaw = getRowValue(normMap, ['Opening Balance', 'Opening', 'Balance'])
  const statusRaw = getRowValue(normMap, ['Status'])

  let type = 'largeVendor'
  if (typeRaw && String(typeRaw).toLowerCase().includes('small')) {
    type = 'smallVendor'
  }

  return {
    name: String(name).trim(),
    contactPerson: contactPerson ? String(contactPerson).trim() : '',
    phone: phone ? String(phone).trim() : '',
    email: email ? String(email).trim() : '',
    address: address ? String(address).trim() : '',
    type: type,
    gstin: gstin ? String(gstin).trim() : '',
    openingBalance: Number(openingBalanceRaw) || 0,
    status: statusRaw && String(statusRaw).toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
  }
}

function parseBillRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const billNumber = getRowValue(normMap, ['Bill Number', 'Bill No', 'Invoice Number', 'Invoice No', 'Bill ID', 'Ref', 'Reference', 'billNumber'])
  const vendorName = getRowValue(normMap, ['Vendor Name', 'Vendor', 'vendorId', 'Supplier', 'Party Name', 'Party'])
  const amountRaw = getRowValue(normMap, ['Amount', 'Bill Amount', 'Total Amount', 'Total'])
  const billDateRaw = getRowValue(normMap, ['Bill Date', 'Date', 'Invoice Date', 'billDate'])
  const dueDateRaw = getRowValue(normMap, ['Due Date', 'Expiry Date', 'dueDate'])
  const statusRaw = getRowValue(normMap, ['Status', 'Bill Status'])
  const remarks = getRowValue(normMap, ['Remarks', 'Notes', 'notes', 'remarks', 'Description'])

  if (!billNumber || String(billNumber).trim() === '') {
    invalidRows.push({ sheet: 'Bills', row: rowIndex + 2, reason: 'Missing Bill Number' })
    return null
  }
  const amount = Number(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    invalidRows.push({ sheet: 'Bills', row: rowIndex + 2, reason: `Invalid Bill Amount "${amountRaw}" for Bill ${billNumber}` })
    return null
  }

  const billDate = parseExcelDate(billDateRaw) || new Date().toISOString().split('T')[0]
  const dueDate = parseExcelDate(dueDateRaw) || billDate

  let status = 'UNPAID'
  if (statusRaw) {
    const s = String(statusRaw).toUpperCase()
    if (s.includes('PARTIAL')) status = 'PARTIALLY_PAID'
    else if (s === 'PAID') status = 'PAID'
    else status = 'UNPAID'
  }

  return {
    billNumber: String(billNumber).trim(),
    vendorName: vendorName ? String(vendorName).trim() : 'Primary Vendor',
    vendorId: vendorName ? String(vendorName).trim() : 'Primary Vendor',
    amount: amount,
    paidAmount: 0,
    outstandingAmount: amount,
    billDate: billDate,
    dueDate: dueDate,
    status: status,
    remarks: remarks ? String(remarks).trim() : ''
  }
}

function parseFinancierRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const name = getRowValue(normMap, ['Name', 'Financier Name', 'Financier', 'Lender Name', 'Lender', 'Party Name'])
  if (!name || String(name).trim() === '') {
    invalidRows.push({ sheet: 'Financiers', row: rowIndex + 2, reason: 'Missing Financier Name' })
    return null
  }

  const contactPerson = getRowValue(normMap, ['Contact Person', 'Contact'])
  const phone = getRowValue(normMap, ['Phone', 'Mobile'])
  const email = getRowValue(normMap, ['Email'])
  const address = getRowValue(normMap, ['Address'])
  const rateRaw = getRowValue(normMap, ['Default Interest Rate', 'Interest Rate', 'Rate', 'ROI'])
  const statusRaw = getRowValue(normMap, ['Status'])

  return {
    name: String(name).trim(),
    contactPerson: contactPerson ? String(contactPerson).trim() : '',
    phone: phone ? String(phone).trim() : '',
    email: email ? String(email).trim() : '',
    address: address ? String(address).trim() : '',
    defaultInterestRate: Number(rateRaw) || 12,
    status: statusRaw && String(statusRaw).toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
  }
}

function parseChequeRow(row, rowIndex, invalidRows) {
  const normMap = {}
  for (const key of Object.keys(row)) {
    normMap[normalizeString(key)] = row[key]
  }

  const chequeNumber = getRowValue(normMap, ['Cheque Number', 'Cheque No', 'Check Number', 'Check No', 'chequeNumber'])
  const partyName = getRowValue(normMap, ['Party Name', 'Party', 'Payee Name', 'Payee', 'Vendor', 'Financier'])
  const amountRaw = getRowValue(normMap, ['Amount', 'Cheque Amount'])
  const chequeDateRaw = getRowValue(normMap, ['Cheque Date', 'Date', 'Issue Date', 'chequeDate'])
  const bankName = getRowValue(normMap, ['Bank Name', 'Bank', 'bankName'])
  const statusRaw = getRowValue(normMap, ['Status'])

  if (!chequeNumber || String(chequeNumber).trim() === '') {
    invalidRows.push({ sheet: 'Cheques', row: rowIndex + 2, reason: 'Missing Cheque Number' })
    return null
  }
  const amount = Number(amountRaw)
  if (isNaN(amount) || amount <= 0) {
    invalidRows.push({ sheet: 'Cheques', row: rowIndex + 2, reason: `Invalid Cheque Amount "${amountRaw}"` })
    return null
  }

  return {
    chequeNumber: String(chequeNumber).trim(),
    partyName: partyName ? String(partyName).trim() : 'Party',
    amount: amount,
    chequeDate: parseExcelDate(chequeDateRaw),
    bankName: bankName ? String(bankName).trim() : '',
    status: statusRaw && ['CLEARED', 'BOUNCED', 'CANCELLED'].includes(String(statusRaw).toUpperCase()) ? String(statusRaw).toUpperCase() : 'PENDING'
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
  let vendorSheetName = findMatchingSheet(sheetNames, ['Vendors', 'Vendor', 'Suppliers', 'Supplier', 'Vendor List'], ['vendor', 'supplier'])
  let billSheetName = findMatchingSheet(sheetNames, ['Bills', 'Bill', 'Purchase Bills', 'PurchaseBills', 'Invoices', 'Invoice'], ['bill', 'invoice'])
  let financierSheetName = findMatchingSheet(sheetNames, ['Financiers', 'Financier', 'Lenders', 'Lender', 'Investors'], ['financier', 'lender'])
  let chequeSheetName = findMatchingSheet(sheetNames, ['Cheques', 'Cheque', 'Checks', 'Check', 'Cheque Registry'], ['cheque', 'check'])
  let paymentSheetName = findMatchingSheet(sheetNames, ['Payments', 'Payment', 'Vendor Payments', 'VendorPayments'], ['payment'])
  let repaymentSheetName = findMatchingSheet(sheetNames, ['Repayments', 'Repayment', 'Loan Repayments', 'LoanRepayments', 'Financier Payments'], ['repayment'])
  let transactionSheetName = findMatchingSheet(sheetNames, ['Transactions', 'Transaction', 'Ledger', 'Ledger Entries', 'Running Ledger'], ['transaction', 'ledger'])
  let settingsSheetName = findMatchingSheet(sheetNames, ['Settings', 'Setting', 'Config', 'Configuration', 'Profile'], ['setting', 'config'])

  // 2. Single-sheet fallback heuristic
  if (sheetNames.length === 1 && !loanSheetName && !vendorSheetName && !billSheetName && !financierSheetName && !chequeSheetName) {
    const onlySheetName = sheetNames[0]
    const rows = getSheetRows(onlySheetName)
    if (rows.length > 0) {
      const firstRowKeys = Object.keys(rows[0]).map(normalizeString)
      if (firstRowKeys.some(k => k.includes('loan') || k.includes('borrower') || k.includes('principal') || k.includes('notenumber'))) {
        loanSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('vendor') || k.includes('supplier') || k.includes('gstin'))) {
        vendorSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('bill') || k.includes('invoice') || k.includes('duedate'))) {
        billSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('cheque') || k.includes('check'))) {
        chequeSheetName = onlySheetName
      } else if (firstRowKeys.some(k => k.includes('financier') || k.includes('lender'))) {
        financierSheetName = onlySheetName
      }
    }
  }

  // Parse Loans
  if (loanSheetName) {
    const rows = getSheetRows(loanSheetName)
    rows.forEach((row, idx) => {
      const item = parseLoanRow(row, idx, invalidRows)
      if (item) parsed.loans.push(item)
    })
  }

  // Parse Vendors
  if (vendorSheetName) {
    const rows = getSheetRows(vendorSheetName)
    rows.forEach((row, idx) => {
      const item = parseVendorRow(row, idx, invalidRows)
      if (item) parsed.vendors.push(item)
    })
  }

  // Parse Bills
  if (billSheetName) {
    const rows = getSheetRows(billSheetName)
    rows.forEach((row, idx) => {
      const item = parseBillRow(row, idx, invalidRows)
      if (item) parsed.bills.push(item)
    })
  }

  // Parse Financiers
  if (financierSheetName) {
    const rows = getSheetRows(financierSheetName)
    rows.forEach((row, idx) => {
      const item = parseFinancierRow(row, idx, invalidRows)
      if (item) parsed.financiers.push(item)
    })
  }

  // Parse Cheques
  if (chequeSheetName) {
    const rows = getSheetRows(chequeSheetName)
    rows.forEach((row, idx) => {
      const item = parseChequeRow(row, idx, invalidRows)
      if (item) parsed.cheques.push(item)
    })
  }

  // Parse generic tables if exported from official system
  if (paymentSheetName) {
    parsed.payments = getSheetRows(paymentSheetName)
  }
  if (repaymentSheetName) {
    parsed.repayments = getSheetRows(repaymentSheetName)
  }
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
  if (counts.cheques > 0) summaryParts.push(`${counts.cheques} cheques`)

  return {
    parsed,
    counts,
    invalidRows,
    summaryText: summaryParts.join(' · ')
  }
}
