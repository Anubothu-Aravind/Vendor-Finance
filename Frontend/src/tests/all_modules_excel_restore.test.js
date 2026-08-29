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

  await t.test('2. Module 1: Vendors Sheet Import (including status in balance column)', () => {
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
      },
      {
        'Vendor Name': 'ABC Mill',
        'Phone': '9876543211',
        'GSTIN': '24AABCS1234F1Z6',
        'Opening Balance': 'Active', // Status string placed in opening balance
        'Vendor Type': 'smallVendor'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Vendors')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.vendors, 2)
    assert.strictEqual(res.invalidRows.length, 0)
    
    const v1 = res.parsed.vendors[0]
    assert.strictEqual(v1.name, 'Shree Textiles Pvt Ltd')
    assert.strictEqual(v1.openingBalance, 25000)
    assert.strictEqual(v1.status, 'Active')

    const v2 = res.parsed.vendors[1]
    assert.strictEqual(v2.name, 'ABC Mill')
    assert.strictEqual(v2.openingBalance, 0)
    assert.strictEqual(v2.status, 'Active')
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

  await t.test('4. Module 3: Finance (Financiers) Sheet Import with Finance Provider / Provider Name', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      {
        'Finance Provider': 'Apex Capital',
        'Contact Person': 'Rajesh Shah',
        'Phone': '9876500001',
        'Interest Rate': '12.5%',
        'Status': 'ACTIVE'
      },
      {
        'Provider Name': 'Prime Finance Ltd',
        'Contact Person': 'Vikram Patel',
        'Phone': '9876500002',
        'Interest Rate': '10%',
        'Status': 'Active'
      },
      {
        'Lender': 'Zenith Investments',
        'Phone': '9876500003',
        'Default Interest Rate': '14%'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Finance')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.financiers, 3)
    assert.strictEqual(res.invalidRows.length, 0)
    assert.strictEqual(res.parsed.financiers[0].name, 'Apex Capital')
    assert.strictEqual(res.parsed.financiers[0].defaultInterestRate, 12.5)
    assert.strictEqual(res.parsed.financiers[1].name, 'Prime Finance Ltd')
    assert.strictEqual(res.parsed.financiers[2].name, 'Zenith Investments')
  })

  await t.test('5. Module 4: Loans Sheet Import with Optional Dates and Rates', () => {
    const wb = XLSX.utils.book_new()
    const rows = [
      { 'Loan Number': 'LN-01', 'Borrower Name': 'Ravi Kumar', 'Loan Amount': '₹50,000', 'Interest Rate': '10.5%', 'Loan Date': '05-08-2026', 'Maturity Date': '05-08-2027' },
      { 'Loan Number': 'LN-02', 'Borrower Name': 'Suresh', 'Loan Amount': '75000', 'Interest Rate': '', 'Loan Date': '', 'Maturity Date': '' },
      { 'Loan Number': 'LN-03', 'Borrower Name': 'Deepak', 'Loan Amount': '100000', 'Interest Rate': '12%' }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Loans')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.loans, 3)
    assert.strictEqual(res.invalidRows.length, 0)
    assert.strictEqual(res.parsed.loans[0].principalAmount, 50000)
    assert.strictEqual(res.parsed.loans[0].interestRate, 10.5)
    assert.strictEqual(res.parsed.loans[0].drawdownDate, '2026-08-05')
    assert.strictEqual(res.parsed.loans[0].maturityDate, '2027-08-05')

    assert.strictEqual(res.parsed.loans[1].principalAmount, 75000)
    assert.strictEqual(res.parsed.loans[1].interestRate, null)
    assert.strictEqual(res.parsed.loans[1].drawdownDate, null)
    assert.strictEqual(res.parsed.loans[1].maturityDate, null)

    assert.strictEqual(res.parsed.loans[2].principalAmount, 100000)
    assert.strictEqual(res.parsed.loans[2].interestRate, 12)
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
      },
      {
        'Reference Number': 'PAY-902',
        'Vendor': 'ABC Mill',
        'Amount': '25,000',
        'Payment Date': '2026-08-06',
        'Payment Mode': 'cash'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Vendor Payments')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.payments, 2)
    assert.strictEqual(res.parsed.payments[0].referenceNumber, 'PAY-901')
    assert.strictEqual(res.parsed.payments[0].amount, 50000)
    assert.strictEqual(res.parsed.payments[0].paymentDate, '2026-08-05')
    assert.strictEqual(res.parsed.payments[0].paymentMode, 'BANK_TRANSFER')
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
      },
      {
        'Reference Number': 'REP-102',
        'Loan Number': 'LN-02',
        'Financier': 'Prime Finance Ltd',
        'Amount': '20,000',
        'Repayment Date': '2026-08-12'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Fin Repayments')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.repayments, 2)
    assert.strictEqual(res.parsed.repayments[0].referenceNumber, 'REP-101')
    assert.strictEqual(res.parsed.repayments[0].amount, 15000)
    assert.strictEqual(res.parsed.repayments[0].principalPaid, 10000)
    assert.strictEqual(res.parsed.repayments[0].interestPaid, 5000)
    assert.strictEqual(res.parsed.repayments[0].repaymentMode, 'CHEQUE')
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
      },
      {
        'Cheque Number': '000456',
        'Party Name': 'Apex Capital',
        'Amount': '30,000',
        'Cheque Date': '2026-08-20',
        'Bank Name': 'ICICI Bank',
        'Status': 'pending',
        'Type': 'received financier'
      }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Cheques')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.cheques, 2)
    assert.strictEqual(res.parsed.cheques[0].chequeNumber, '000123')
    assert.strictEqual(res.parsed.cheques[0].amount, 50000)
    assert.strictEqual(res.parsed.cheques[0].chequeDate, '2026-08-15')
    assert.strictEqual(res.parsed.cheques[0].status, 'CLEARED')
    assert.strictEqual(res.parsed.cheques[0].type, 'ISSUED_VENDOR')
  })

  await t.test('9. Full Multi-Sheet Workbook with All 7 Modules', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Vendor Name': 'V1', 'Phone': '9000000001' },
      { 'Vendor Name': 'V2', 'Phone': '9000000002', 'Opening Balance': 'Active' }
    ]), 'Vendors')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Bill Number': 'PB1', 'Vendor': 'V1', 'Amount': '1000' },
      { 'Bill Number': 'PB2', 'Vendor': 'V2', 'Amount': '2000' }
    ]), 'Bills')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Finance Provider': 'F1', 'Phone': '9000000003' },
      { 'Provider Name': 'F2', 'Phone': '9000000004' }
    ]), 'Finance')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Loan Number': 'L1', 'Borrower': 'B1', 'Principal Amount': '10000' },
      { 'Loan Number': 'L2', 'Borrower': 'B2', 'Principal Amount': '20000' },
      { 'Loan Number': 'L3', 'Borrower': 'B3', 'Principal Amount': '30000' }
    ]), 'Loans')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Reference Number': 'PAY1', 'Vendor': 'V1', 'Amount': '500' },
      { 'Reference Number': 'PAY2', 'Vendor': 'V2', 'Amount': '600' }
    ]), 'Payments')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Reference Number': 'REP1', 'Loan Number': 'L1', 'Amount': '300' },
      { 'Reference Number': 'REP2', 'Loan Number': 'L2', 'Amount': '400' }
    ]), 'Repayments')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'Cheque Number': '000001', 'Payee': 'V1', 'Amount': '500' },
      { 'Cheque Number': '000002', 'Payee': 'V2', 'Amount': '600' }
    ]), 'Cheques')

    const res = parseExcelBackup(XLSX, wb)
    assert.strictEqual(res.counts.vendors, 2)
    assert.strictEqual(res.counts.bills, 2)
    assert.strictEqual(res.counts.financiers, 2)
    assert.strictEqual(res.counts.loans, 3)
    assert.strictEqual(res.counts.payments, 2)
    assert.strictEqual(res.counts.repayments, 2)
    assert.strictEqual(res.counts.cheques, 2)
    assert.strictEqual(res.invalidRows.length, 0)
    assert.strictEqual(res.summaryText, '2 vendors · 2 bills · 3 loans · 2 financiers · 2 payments · 2 repayments · 2 cheques')
  })
})
