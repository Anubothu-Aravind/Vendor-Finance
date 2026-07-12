const mongoose = require('mongoose')

const TransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  type: {
    type: String,
    enum: [
      'BILL_POSTED',          // Purchase Bill created (+ Payable)
      'BILL_PAID',            // Vendor paid (- Payable)
      'LOAN_DRAWDOWN',        // Financier Loan drawdown (+ Loan Outstanding)
      'LOAN_REPAYMENT',       // Repaid loan principal (- Loan Outstanding)
      'INTEREST_ACCRUED',     // Loan interest calculated (+ Loan Outstanding)
      'REPAYMENT_INTEREST',   // Portion of repayment applied to interest
      'REPAYMENT_PRINCIPAL',  // Portion of repayment applied to principal
      'CHEQUE_BOUNCED_REVERSAL' // Reversal entry due to bounced cheque
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // Running balance of either the vendor or the financier outstanding after this entry
  runningBalance: {
    type: Number,
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  financierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Financier',
    default: null
  },
  // Reference link to the source document (Bill, Payment, Loan, Repayment)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceType: {
    type: String,
    required: true,
    enum: ['Bill', 'Payment', 'Loan', 'Repayment', 'Cheque']
  },
  description: {
    type: String,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Transaction', TransactionSchema)
