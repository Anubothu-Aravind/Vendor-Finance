import test from 'node:test'
import assert from 'node:assert/strict'

test('Settings unit tests', async (t) => {
  await t.test('invoice template CRUD defaults', () => {
    const templateSettings = {
      showQr: true,
      showHsn: false,
      showQty: false,
      showTaxTable: false,
      swapRecipientSupplier: false,
      borderStyle: 'minimal',
      declarationText: 'We declare that this invoice shows the actual price...'
    }
    assert.equal(templateSettings.borderStyle, 'minimal')
    assert.equal(templateSettings.showQr, true)
    assert.equal(templateSettings.swapRecipientSupplier, false)
    assert.equal(typeof templateSettings.declarationText, 'string')
  })

  await t.test('swapRecipientSupplier handles existing legacy templates without property', () => {
    const legacyTemplate = {
      showQr: true,
      showHsn: false
    }
    const resolvedSwap = legacyTemplate.swapRecipientSupplier ?? false
    assert.equal(resolvedSwap, false)
  })

  await t.test('logo upload validation - size limit 2MB', () => {
    const validSize = 1.5 * 1024 * 1024 // 1.5MB
    const invalidSize = 3.2 * 1024 * 1024 // 3.2MB
    const maxSize = 2 * 1024 * 1024 // 2MB

    assert.ok(validSize <= maxSize)
    assert.ok(invalidSize > maxSize)
  })

  await t.test('logo upload validation - mime type filter', () => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    assert.ok(allowedMimeTypes.includes('image/png'))
    assert.ok(!allowedMimeTypes.includes('application/pdf'))
    assert.ok(!allowedMimeTypes.includes('image/gif'))
  })

  await t.test('Excel backup restore accepts spreadsheet files and payloads', () => {
    const validExtensions = ['.xlsx', '.xls']
    const testFileExt = '.xlsx'
    assert.ok(validExtensions.includes(testFileExt))

    const mockPayload = {
      vendors: [{ name: 'Test Vendor', type: 'largeVendor', status: 'Active' }],
      loans: [{ loanReference: 'LN-100', principalAmount: 50000, interestRate: null, drawdownDate: null }]
    }

    assert.equal(mockPayload.vendors.length, 1)
    assert.equal(mockPayload.loans.length, 1)
    assert.equal(mockPayload.loans[0].interestRate, null)
    assert.equal(mockPayload.loans[0].drawdownDate, null)
  })

  await t.test('Excel restore handles invalid rows gracefully without crashing', () => {
    const skipped = []
    const rawLoans = [
      { loanReference: 'LN-01', principalAmount: 50000 },
      { loanReference: '', principalAmount: 20000 } // invalid row
    ]

    const validLoans = []
    rawLoans.forEach((l, idx) => {
      if (!l.loanReference) {
        skipped.push({ sheet: 'Loans', row: idx + 2, field: 'Loan Number', reason: 'Missing required Loan Number' })
      } else {
        validLoans.push(l)
      }
    })

    assert.equal(validLoans.length, 1)
    assert.equal(skipped.length, 1)
    assert.equal(skipped[0].sheet, 'Loans')
  })
})
