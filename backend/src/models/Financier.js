const mongoose = require('mongoose')

const FinancierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    required: true
  },
  // Default annual interest rate (e.g. 12.5% -> stored as 12.5)
  defaultInterestRate: {
    type: Number,
    required: true,
    min: 0
  },
  // Cached active outstanding principal + accrued interest
  outstandingBalance: {
    type: Number,
    default: 0,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Financier', FinancierSchema)
