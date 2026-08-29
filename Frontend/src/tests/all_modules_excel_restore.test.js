import test from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import {
  parseExcelBackup,
  normalizeText,
  normalizeNumber,
  normalizePercentage,
  normalizeDate,
  normalizePhone,
  normalizeGSTIN,
  normalizeIFSC,
  normalizeAccountNumber,
  normalizeChequeNumber
} from '../utils/excelParser.js'

test('All 7 Modules Excel Importer & Normalization Tests', async (t) => {
  
  await t.test('1. Normalization Utility Functions', () => {
    // normalizeText
    assert.strictEqual(normalizeText('   Shree   Textiles   Pvt   Ltd   '), 'Shree Textiles Pvt Ltd')
    assert.strictEqual(normalizeText('—'), '')
    assert.strictEqual(normalizeText(''), '')
    assert.strictEqual(normalizeText(null), '')

    // normalizeNumber & Currency
    assert.deepStrictEqual(normalizeNumber('50000'), { valid: true, value: 50000 })
    assert.deepStrictEqual(normalizeNumber('50,000'), { valid: true, value: 50000 })
    assert.deepStrictEqual(normalizeNumber('50 000'), { valid: true, value: 50000 })
    assert.deepStrictEqual(normalizeNumber('₹50,000'), { valid: true, value: 50000 })
    assert.deepStrictEqual(normalizeNumber('₹ 50,000.50'), { valid: true, value: 50000.5 })
    assert.deepStrictEqual(normalizeNumber('Rs 25,000'), { valid: true, value: 25000 })
    assert.deepStrictEqual(normalizeNumber('INR 25,000'), { valid: true, value: 25000 })
    assert.deepStrictEqual(normalizeNumber('abc', { required: true }).valid, false)
    assert.deepStrictEqual(normalizeNumber('hello').valid, false)

    // normalizePercentage
    assert.deepStrictEqual(normalizePercentage('12'), { valid: true, value: 12 })
    assert.deepStrictEqual(normalizePercentage('10.5%'), { valid: true, value: 10.5 })
    assert.deepStrictEqual(normalizePercentage(' 18 % '), { valid: true, value: 18 })
    assert.deepStrictEqual(normalizePercentage('').value, null)

    // normalizePhone
    assert.strictEqual(normalizePhone('9876543210'), '9876543210')
    assert.strictEqual(normalizePhone('98765 43210'), '9876543210')
    assert.strictEqual(normalizePhone('+91-9876543210'), '+919876543210')

    // normalizeGSTIN & IFSC
    assert.strictEqual(normalizeGSTIN('24aabcs1234f1z5'), '24AABCS1234F1Z5')
    assert.strictEqual(normalizeIFSC('hdfc0001234'), 'HDFC0001234')

    // normalizeAccountNumber & normalizeChequeNumber (Leading Zeros)
    assert.strictEqual(normalizeAccountNumber('001234567890'), '001234567890')
    assert.strictEqual(normalizeChequeNumber('000123'), '000123')
    assert.strictEqual(normalizeChequeNumber('123'), '000123')
  })

  await t.test('2. Module 1: Vendors Sheet Import', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Vendor Name': '  Shree Textiles Pvt Ltd  ',
        'Phone': '+91-9876543210',
        'GSTIN': '24aabcs1234f1z5',
        'Opening Balance': '₹ 25,000',
        'Vendor Type': 'big vendor',
        'Account Status': 'active',
        'Bank Name': 'HDFC Bank',
        'Account Number': '001234567890',
        'IFSC': 'hdfc0001234'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Vendors')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.vendors, 1)
    const v = res.parsed.vendors[0]
    assert.strictEqual(v.name, 'Shree Textiles Pvt Ltd')
    assert.strictEqual(v.phone, '+919876543210')
    assert.strictEqual(v.gstin, '24AABCS1234F1Z5')
    assert.strictEqual(v.openingBalance, 25000)
    assert.strictEqual(v.type, 'largeVendor')
    assert.strictEqual(v.status, 'Active')
    assert.strictEqual(v.accountNo, '001234567890')
    assert.strictEqual(v.ifsc, 'HDFC0001234')
  })

  await t.test('3. Module 2: Purchase Bills Sheet Import', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Bill Number': 'PB-001',
        'Vendor': 'Shree Textiles',
        'Bill Date': '05-08-2026',
        'Due Date': '05/09/2026',
        'Amount': '₹ 25,000',
        'Status': 'pending'
      },
      {
        'Bill Number': 'PB-002',
        'Vendor': 'Shree Textiles',
        'Bill Date': 'August 5, 2026',
        'Due Date': '5 Sept 2026',
        'Amount': '50,000.00',
        'Status': 'paid'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase Bills')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.bills, 2)
    assert.strictEqual(res.parsed.bills[0].billNumber, 'PB-001')
    assert.strictEqual(res.parsed.bills[0].billDate, '2026-08-05')
    assert.strictEqual(res.parsed.bills[0].amount, 25000)
    assert.strictEqual(res.parsed.bills[0].status, 'UNPAID')
    assert.strictEqual(res.parsed.bills[1].status, 'PAID')
  })

  await t.test('4. Module 3: Finance (Financiers) Sheet Import', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Financier Name': '  Apex Capital  ',
        'Contact Person': 'Rajesh Shah',
        'Phone': '9876500001',
        'Default Interest Rate': '12.5%',
        'Status': 'ACTIVE'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Finance')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.financiers, 1)
    const f = res.parsed.financiers[0]
    assert.strictEqual(f.name, 'Apex Capital')
    assert.strictEqual(f.defaultInterestRate, 12.5)
    assert.strictEqual(f.status, 'Active')
  })

  await t.test('5. Module 4: Loans Sheet Import with Optional Dates and Rates', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      { 'Loan Number': 'LN-01', 'Borrower Name': 'Ravi Kumar', 'Loan Amount': '₹50,000', 'Interest Rate': '10.5%', 'Loan Date': '05-08-2026', 'Maturity Date': '05-08-2027' },
      { 'Loan Number': 'LN-02', 'Borrower Name': 'Suresh', 'Loan Amount': '75000', 'Interest Rate': '', 'Loan Date': '', 'Maturity Date': '' }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Loans')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.loans, 2)
    assert.strictEqual(res.parsed.loans[0].principalAmount, 50000)
    assert.strictEqual(res.parsed.loans[0].interestRate, 10.5)
    assert.strictEqual(res.parsed.loans[0].drawdownDate, '2026-08-05')
    assert.strictEqual(res.parsed.loans[0].maturityDate, '2027-08-05')

    assert.strictEqual(res.parsed.loans[1].principalAmount, 75000)
    assert.strictEqual(res.parsed.loans[1].interestRate, null)
    assert.strictEqual(res.parsed.loans[1].drawdownDate, null)
    assert.strictEqual(res.parsed.loans[1].maturityDate, null)
  })

  await t.test('6. Module 5: Vendor Payments Sheet Import', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Reference Number': 'PAY-901',
        'Vendor': 'Shree Textiles',
        'Amount': '₹50,000',
        'Payment Date': '05/08/2026',
        'Payment Mode': 'bank transfer',
        'Bank Name': 'SBI Bank'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Vendor Payments')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.payments, 1)
    const p = res.parsed.payments[0]
    assert.strictEqual(p.referenceNumber, 'PAY-901')
    assert.strictEqual(p.amount, 50000)
    assert.strictEqual(p.paymentDate, '2026-08-05')
    assert.strictEqual(p.paymentMode, 'BANK_TRANSFER')
  })

  await t.test('7. Module 6: Fin. Repayments Sheet Import', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Reference Number': 'REP-101',
        'Loan Number': 'LN-01',
        'Financier': 'Apex Capital',
        'Amount': '15,000',
        'Principal Paid': '10,000',
        'Interest Paid': '5,000',
        'Repayment Date': '10-08-2026',
        'Repayment Mode': 'cheque'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Fin Repayments')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.repayments, 1)
    const r = res.parsed.repayments[0]
    assert.strictEqual(r.referenceNumber, 'REP-101')
    assert.strictEqual(r.amount, 15000)
    assert.strictEqual(r.principalPaid, 10000)
    assert.strictEqual(r.interestPaid, 5000)
    assert.strictEqual(r.repaymentMode, 'CHEQUE')
  })

  await t.test('8. Module 7: Cheques Sheet Import (Leading Zeros Preserved)', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Cheque Number': '000123',
        'Payee': 'Shree Textiles',
        'Amount': '₹50,000',
        'Cheque Date': '15-08-2026',
        'Bank Name': 'HDFC Bank',
        'Status': 'cleared',
        'Type': 'issued vendor'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Cheques')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.cheques, 1)
    const c = res.parsed.cheques[0]
    assert.strictEqual(c.chequeNumber, '000123')
    assert.strictEqual(c.amount, 50000)
    assert.strictEqual(c.chequeDate, '2026-08-15')
    assert.strictEqual(c.status, 'CLEARED')
    assert.strictEqual(c.type, 'ISSUED_VENDOR')
  })

  await t.test('9. Invalid Data Reports Useful Errors and Skips Invalid Rows', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      { 'Bill Number': 'PB-VALID', 'Vendor': 'Vendor A', 'Amount': '10000', 'Bill Date': '2026-01-01' },
      { 'Bill Number': 'PB-INVALID', 'Vendor': 'Vendor B', 'Amount': 'abc', 'Bill Date': '2026-01-01' }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase Bills')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.bills, 1)
    assert.strictEqual(res.invalidRows.length, 1)
    assert.strictEqual(res.invalidRows[0].sheet, 'Purchase Bills')
    assert.strictEqual(res.invalidRows[0].field, 'Amount')
    assert.strictEqual(res.invalidRows[0].reason, 'Invalid numeric value "abc"')
  })
})
