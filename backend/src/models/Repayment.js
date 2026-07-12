const mongoose = require('mongoose')

const RepaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  repaymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  interestPaid: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  principalPaid: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  repaymentMode: {
    type: String,
    required: true,
    enum: ['CHEQUE', 'BANK_TRANSFER', 'CASH', 'OTHER'],
    default: 'BANK_TRANSFER'
  },
  chequeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cheque',
    default: null
  },
  referenceNumber: {
    type: String,
    required: true,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Repayment', RepaymentSchema)
