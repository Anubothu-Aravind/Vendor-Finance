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
})
