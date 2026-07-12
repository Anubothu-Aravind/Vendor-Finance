const mongoose = require('mongoose')

const BillSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    trim: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  outstandingAmount: {
    type: Number,
    required: true,
    default: function() {
      return this.amount
    },
    min: 0
  },
  billDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
    default: 'UNPAID'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
})

// Compound index to ensure uniqueness of bill number per vendor
BillSchema.index({ billNumber: 1, vendorId: 1 }, { unique: true })

module.exports = mongoose.model('Bill', BillSchema)
