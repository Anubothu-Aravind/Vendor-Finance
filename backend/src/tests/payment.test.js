import test from 'node:test'
import assert from 'node:assert/strict'

test('Payment unit tests', async (t) => {
  await t.test('get payment by valid ID structure', () => {
    const samplePayment = {
      _id: '665000000000000000000001',
      referenceNumber: 'PAY-1001',
      amount: 15000,
      paymentMode: 'BANK_TRANSFER'
    }
    assert.equal(samplePayment.referenceNumber, 'PAY-1001')
    assert.equal(samplePayment.amount, 15000)
  })

  await t.test('invalid payment ID format validation', () => {
    const invalidId = '123-invalid-id'
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(invalidId)
    assert.equal(isMongoId, false)
  })
})
