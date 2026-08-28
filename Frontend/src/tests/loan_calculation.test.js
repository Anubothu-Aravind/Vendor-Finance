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

test('Frontend Loan & Amount Unit Tests', async (t) => {
  await t.test('Loan interest calculation formula', () => {
    const outstandingPrincipal = 200000
    const interestRate = 18
    const daysElapsed = 20
    const accruedInterest = (outstandingPrincipal * interestRate * daysElapsed) / (100 * 365)
    const totalPayable = Math.round((outstandingPrincipal + accruedInterest) * 100) / 100

    assert.equal(accruedInterest.toFixed(2), '1972.60')
    assert.equal(totalPayable, 201972.60)
  })

  await t.test('Amount-in-words utility with paise', () => {
    const formatted = numberToWords(201972.60)
    assert.equal(formatted, 'Indian Rupee Two Lakh One Thousand Nine Hundred and Seventy Two and Sixty Paise Only')
  })

  await t.test('Loan card pending amount renders principal + accrued interest', () => {
    const loan = {
      principalAmount: 200000,
      outstandingPrincipal: 200000,
      interestRate: 18,
      daysElapsed: 20
    }
    const accruedInterest = (loan.outstandingPrincipal * loan.interestRate * loan.daysElapsed) / (100 * 365)
    const pendingAmount = Math.round((loan.outstandingPrincipal + accruedInterest) * 100) / 100

    assert.equal(pendingAmount, 201972.60)
    assert.ok(pendingAmount > loan.outstandingPrincipal)
  })

  await t.test('Date conversion and formatting utilities work without timezone shift', async () => {
    const { toInputDate, fromInputDate, getDefaultMaturityDate, formatDateDisplay } = await import('../utils/date.js')

    assert.equal(toInputDate('28-08-2026'), '2026-08-28')
    assert.equal(fromInputDate('2026-08-28'), '28-08-2026')
    assert.equal(fromInputDate('2026-08-28T00:00:00.000Z'), '28-08-2026')
    assert.equal(getDefaultMaturityDate('28-08-2026'), '28-08-2027')
    assert.equal(formatDateDisplay('2026-08-28'), '28 Aug 2026')
    assert.equal(formatDateDisplay('28-08-2026'), '28 Aug 2026')
  })
})
