import test from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import { parseExcelBackup, parseExcelDate, normalizeString } from '../utils/excelParser.js'

test('Excel Restore Parser Tests', async (t) => {
  await t.test('parseExcelDate handles various date formats, serial numbers, and optional empty values', () => {
    // Empty / null / dash / undefined
    assert.strictEqual(parseExcelDate(null), null)
    assert.strictEqual(parseExcelDate(undefined), null)
    assert.strictEqual(parseExcelDate(''), null)
    assert.strictEqual(parseExcelDate('—'), null)
    assert.strictEqual(parseExcelDate('-'), null)
    assert.strictEqual(parseExcelDate('N/A'), null)

    // ISO strings
    assert.strictEqual(parseExcelDate('2026-01-10'), '2026-01-10')
    assert.strictEqual(parseExcelDate('2026-02-15T00:00:00.000Z'), '2026-02-15')

    // DD-MM-YYYY and DD/MM/YYYY
    assert.strictEqual(parseExcelDate('10-01-2026'), '2026-01-10')
    assert.strictEqual(parseExcelDate('15/02/2026'), '2026-02-15')
    assert.strictEqual(parseExcelDate('1/3/2026'), '2026-03-01')

    // Date object
    const d = new Date(2026, 0, 10)
    assert.strictEqual(parseExcelDate(d), '2026-01-10')
  })

  await t.test('parseExcelBackup correctly parses 10-row loan_test_data format with optional dates and rates', () => {
    const loanRows = [
      { 'Loan Number': 'LN001', 'Borrower Name': 'Ravi Kumar', 'Phone': '9876543210', 'Principal Amount': 50000, 'Interest Rate': 12, 'Loan Date': '2026-01-10', 'Maturity Date': '2026-12-10', 'Status': 'Active' },
      { 'Loan Number': 'LN002', 'Borrower Name': 'Suresh Reddy', 'Phone': '9876543211', 'Principal Amount': 75000, 'Interest Rate': 10.5, 'Loan Date': '2026-02-15', 'Maturity Date': '', 'Status': 'Active' },
      { 'Loan Number': 'LN003', 'Borrower Name': 'Priya Sharma', 'Phone': '9876543212', 'Principal Amount': 100000, 'Interest Rate': 11, 'Loan Date': '2026-03-01', 'Maturity Date': '2027-03-01', 'Status': 'Active' },
      { 'Loan Number': 'LN004', 'Borrower Name': 'Anil Kumar', 'Phone': '9876543213', 'Principal Amount': 25000, 'Interest Rate': 9.5, 'Loan Date': '', 'Maturity Date': '', 'Status': 'Pending' },
      { 'Loan Number': 'LN005', 'Borrower Name': 'Kavita Rao', 'Phone': '9876543214', 'Principal Amount': 150000, 'Interest Rate': 12, 'Loan Date': '2026-01-20', 'Maturity Date': '2027-01-20', 'Status': 'Active' },
      { 'Loan Number': 'LN006', 'Borrower Name': 'Vijay Varma', 'Phone': '9876543215', 'Principal Amount': 60000, 'Interest Rate': '', 'Loan Date': '2026-02-01', 'Maturity Date': '', 'Status': 'Active' },
      { 'Loan Number': 'LN007', 'Borrower Name': 'Sneha Patel', 'Phone': '9876543216', 'Principal Amount': 80000, 'Interest Rate': 10, 'Loan Date': '', 'Maturity Date': '2026-11-30', 'Status': 'Active' },
      { 'Loan Number': 'LN008', 'Borrower Name': 'Manoj Gupta', 'Phone': '9876543217', 'Principal Amount': 45000, 'Interest Rate': 11.5, 'Loan Date': '2026-02-10', 'Maturity Date': '2026-08-10', 'Status': 'Closed' },
      { 'Loan Number': 'LN009', 'Borrower Name': 'Divya Nair', 'Phone': '9876543218', 'Principal Amount': 90000, 'Interest Rate': 12.5, 'Loan Date': '2026-03-05', 'Maturity Date': '', 'Status': 'Active' },
      { 'Loan Number': 'LN010', 'Borrower Name': 'Rajesh Singh', 'Phone': '9876543219', 'Principal Amount': 120000, 'Interest Rate': '', 'Loan Date': '', 'Maturity Date': '', 'Status': 'Active' }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(loanRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Loan Test Data')

    const result = parseExcelBackup(XLSX, wb)

    assert.strictEqual(result.counts.loans, 10)
    assert.strictEqual(result.counts.vendors, 0)
    assert.strictEqual(result.counts.bills, 0)
    assert.strictEqual(result.invalidRows.length, 0)
    assert.strictEqual(result.summaryText, '0 vendors · 0 bills · 10 loans')

    // Verify LN002 (empty maturity date)
    const ln2 = result.parsed.loans.find(l => l.loanReference === 'LN002')
    assert.strictEqual(ln2.principalAmount, 75000)
    assert.strictEqual(ln2.interestRate, 10.5)
    assert.strictEqual(ln2.drawdownDate, '2026-02-15')
    assert.strictEqual(ln2.maturityDate, null)
    assert.strictEqual(ln2.status, 'ACTIVE')

    // Verify LN004 (both dates empty, pending status)
    const ln4 = result.parsed.loans.find(l => l.loanReference === 'LN004')
    assert.strictEqual(ln4.principalAmount, 25000)
    assert.strictEqual(ln4.drawdownDate, null)
    assert.strictEqual(ln4.maturityDate, null)
    assert.strictEqual(ln4.status, 'ACTIVE')

    // Verify LN006 (empty interest rate)
    const ln6 = result.parsed.loans.find(l => l.loanReference === 'LN006')
    assert.strictEqual(ln6.principalAmount, 60000)
    assert.strictEqual(ln6.interestRate, null)

    // Verify LN008 (closed -> SETTLED)
    const ln8 = result.parsed.loans.find(l => l.loanReference === 'LN008')
    assert.strictEqual(ln8.status, 'SETTLED')

    // Verify LN010 (both dates and rate empty)
    const ln10 = result.parsed.loans.find(l => l.loanReference === 'LN010')
    assert.strictEqual(ln10.principalAmount, 120000)
    assert.strictEqual(ln10.interestRate, null)
    assert.strictEqual(ln10.drawdownDate, null)
    assert.strictEqual(ln10.maturityDate, null)
  })

  await t.test('parseExcelBackup recognizes full official Vastrams backup workbook', () => {
    const wb = XLSX.utils.book_new()
    const vendors = [{ 'Name': 'Shree Textiles', 'Phone': '9876543210', 'Type': 'largeVendor', 'Opening Balance': 10000 }]
    const financiers = [{ 'Name': 'Kuber Finance', 'Phone': '9876500000', 'Default Interest Rate': 12 }]
    const loans = [{ 'Loan Number': 'LN-OFF-01', 'Borrower Name': 'Kuber Finance', 'Principal Amount': 50000, 'Loan Date': '2026-01-01' }]
    const bills = [{ 'Bill Number': 'BILL-001', 'Vendor Name': 'Shree Textiles', 'Amount': 20000, 'Bill Date': '2026-01-05', 'Due Date': '2026-02-05' }]

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendors), 'Vendors')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financiers), 'Financiers')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loans), 'Loans')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bills), 'Bills')

    const result = parseExcelBackup(XLSX, wb)
    assert.strictEqual(result.counts.vendors, 1)
    assert.strictEqual(result.counts.financiers, 1)
    assert.strictEqual(result.counts.loans, 1)
    assert.strictEqual(result.counts.bills, 1)
    assert.strictEqual(result.summaryText, '1 vendors · 1 bills · 1 loans · 1 financiers')
  })

  await t.test('parseExcelBackup handles column aliases and casing variations', () => {
    const rows = [
      { 'loan_number': 'LN-CASE-1', 'borrower': 'Ravi', 'loan_amount': '50000', 'rate': '12', 'drawdown_date': '2026-01-10' }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Loans')

    const result = parseExcelBackup(XLSX, wb)
    assert.strictEqual(result.counts.loans, 1)
    assert.strictEqual(result.parsed.loans[0].loanReference, 'LN-CASE-1')
    assert.strictEqual(result.parsed.loans[0].principalAmount, 50000)
    assert.strictEqual(result.parsed.loans[0].interestRate, 12)
    assert.strictEqual(result.parsed.loans[0].drawdownDate, '2026-01-10')
  })
})
