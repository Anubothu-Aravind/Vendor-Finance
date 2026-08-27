const mongoose = require('mongoose')

const InvoiceTemplateSchema = new mongoose.Schema({
  accentColor: {
    type: String,
    default: '#00C896'
  },
  borderColor: {
    type: String,
    default: '#000000'
  },
  headerBackground: {
    type: String,
    default: '#F8FAFC'
  },
  tableHeaderBackground: {
    type: String,
    default: '#F1F5F9'
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  fontFamily: {
    type: String,
    default: 'Inter, sans-serif'
  },
  showQRCode: {
    type: Boolean,
    default: true
  },
  showGSTTable: {
    type: Boolean,
    default: false
  },
  showHSNColumn: {
    type: Boolean,
    default: false
  },
  showQuantityColumn: {
    type: Boolean,
    default: false
  },
  swapRecipientSupplier: {
    type: Boolean,
    default: false
  },
  showSignatory: {
    type: Boolean,
    default: true
  },
  showBankDetails: {
    type: Boolean,
    default: true
  },
  signatoryText: {
    type: String,
    default: 'Authorised Signatory'
  },
  declarationText: {
    type: String,
    default: 'We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.'
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('InvoiceTemplate', InvoiceTemplateSchema)
