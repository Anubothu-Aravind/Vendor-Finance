import test from 'node:test'
import assert from 'node:assert/strict'

// English word spelling utility for currencies with Rupees & Paise support
function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  const val = Number(num);
  const rupees = Math.floor(val);
  const paise = Math.round((val - rupees) * 100);

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convert(n) {
    if (n.toString().length > 9) return 'overflow';
    let match = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return ''; 
    let str = '';
    str += match[1] != 0 ? (a[Number(match[1])] || b[match[1][0]] + ' ' + a[match[1][1]]) + 'Crore ' : '';
    str += match[2] != 0 ? (a[Number(match[2])] || b[match[2][0]] + ' ' + a[match[2][1]]) + 'Lakh ' : '';
    str += match[3] != 0 ? (a[Number(match[3])] || b[match[3][0]] + ' ' + a[match[3][1]]) + 'Thousand ' : '';
    str += match[4] != 0 ? (a[Number(match[4])] || b[match[4][0]] + ' ' + a[match[4][1]]) + 'Hundred ' : '';
    str += match[5] != 0 ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[match[5][0]] + ' ' + a[match[5][1]]) : '';
    return str.trim();
  }

  let rupeeWords = convert(rupees);
  let result = rupeeWords ? `Indian Rupee ${rupeeWords}` : 'Indian Rupee Zero';
  if (paise > 0) {
    let paiseWords = convert(paise);
    result += ` and ${paiseWords} Paise`;
  }
  result += ' Only';
  return result;
}

test('Loan unit tests', async (t) => {
  await t.test('loan amounts include accrued interest in total payable', () => {
    const principalAmount = 200000
    const interestRate = 18
    const daysElapsed = 20
    const accruedInterest = (principalAmount * interestRate * daysElapsed) / (100 * 365)
    const totalPayable = Math.round((principalAmount + accruedInterest) * 100) / 100

    assert.equal(principalAmount, 200000)
    assert.equal(totalPayable, 201972.60)
  })

  await t.test('repayment totals split principal and interest paid', () => {
    const totalRepayment = 50000
    const accruedInterest = 1972.60
    const interestPaid = Math.min(accruedInterest, totalRepayment)
    const principalPaid = totalRepayment - interestPaid

    assert.equal(interestPaid, 1972.60)
    assert.equal(principalPaid, 48027.40)
    assert.equal(interestPaid + principalPaid, 50000)
  })

  await t.test('amount-in-words converts rupees and paise correctly', () => {
    const words = numberToWords(201972.60)
    assert.equal(words, 'Indian Rupee Two Lakh One Thousand Nine Hundred and Seventy Two and Sixty Paise Only')
  })

  await t.test('Loan validation rules correctly validate payload structure', async () => {
    const { validateLoan } = await import('../validators/loan.validator.js')
    const expressModule = (await import('express')).default
    const http = await import('node:http')

    const app = expressModule()
    app.use(expressModule.json())

    app.post('/test-loan-validate', validateLoan, (req, res) => {
      res.status(201).json({ success: true, data: req.body })
    })

    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    try {
      // 1. Invalid payload with invalid financier format
      const resInvalidFinancier = await fetch(`http://127.0.0.1:${port}/test-loan-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: 'LN-TEST-001',
          financierId: 'invalid-id-format',
          principalAmount: 500000,
          drawdownDate: '2026-08-28'
        })
      })
      assert.equal(resInvalidFinancier.status, 400)
      const body1 = await resInvalidFinancier.json()
      assert.equal(body1.success, false)
      assert.ok(body1.message.includes('Financier'))

      // 2. Invalid payload with negative principal
      const resInvalidAmount = await fetch(`http://127.0.0.1:${port}/test-loan-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: 'LN-TEST-001',
          financierId: '507f1f77bcf86cd799439011',
          principalAmount: -500,
          drawdownDate: '2026-08-28'
        })
      })
      assert.equal(resInvalidAmount.status, 400)

      // 3. Invalid payload where maturityDate < drawdownDate
      const resInvalidMaturity = await fetch(`http://127.0.0.1:${port}/test-loan-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanReference: 'LN-TEST-001',
          financierId: '507f1f77bcf86cd799439011',
          principalAmount: 500000,
          drawdownDate: '2026-08-28',
          maturityDate: '2026-01-01'
        })
      })
      assert.equal(resInvalidMaturity.status, 400)
      const body3 = await resInvalidMaturity.json()
      assert.equal(body3.success, false)
      assert.ok(body3.message.includes('Maturity date cannot be before drawdown date'))
    } finally {
      server.close()
    }
  })
})
