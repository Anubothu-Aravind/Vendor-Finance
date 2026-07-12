const mongoose = require('mongoose')

const LoanSchema = new mongoose.Schema({
  loanReference: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  financierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Financier',
    required: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0
  },
  paidPrincipal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  paidInterest: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  accruedInterest: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  outstandingPrincipal: {
    type: Number,
    required: true,
    default: function() {
      return this.principalAmount
    },
    min: 0
  },
  drawdownDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  maturityDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'SETTLED', 'OVERDUE'],
    default: 'ACTIVE'
  },
  linkedChequeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cheque',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual Getters and Setters for compatibility with Settings page Specs
LoanSchema.virtual('noteNumber')
  .get(function() { return this.loanReference })
  .set(function(val) { this.loanReference = val })

LoanSchema.virtual('financier')
  .get(function() { return this.financierId })
  .set(function(val) { this.financierId = val })

LoanSchema.virtual('date')
  .get(function() { return this.drawdownDate })
  .set(function(val) { this.drawdownDate = val })

LoanSchema.virtual('amount')
  .get(function() { return this.principalAmount })
  .set(function(val) { this.principalAmount = val })

LoanSchema.virtual('paid')
  .get(function() { return this.paidPrincipal })
  .set(function(val) { this.paidPrincipal = val })

LoanSchema.virtual('outstanding')
  .get(function() { return this.outstandingPrincipal })
  .set(function(val) { this.outstandingPrincipal = val })

module.exports = mongoose.model('Loan', LoanSchema)
