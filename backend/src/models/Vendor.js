const mongoose = require('mongoose')

const VendorSchema = new mongoose.Schema({
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
    trim: true
  },
  type: {
    type: String,
    enum: ['smallVendor', 'largeVendor'],
    default: 'largeVendor',
    required: true
  },
  gstin: {
    type: String,
    trim: true,
    default: ''
  },
  openingBalance: {
    type: Number,
    default: 0,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    required: true
  },
  bankName: {
    type: String,
    trim: true,
    default: ''
  },
  accountNo: {
    type: String,
    trim: true,
    default: ''
  },
  ifsc: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  // Cached aggregate outstanding balance (sum of unpaid/partially paid bills)
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

module.exports = mongoose.model('Vendor', VendorSchema)
